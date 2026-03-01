"""Step orchestration: run wizard steps via Claude API + MCP (blender-mcp)."""
import base64
import os
from pathlib import Path
from typing import Any, Optional

from anthropic import Anthropic
from app.mcp_client import call_mcp_tool, list_mcp_tools, mcp_session
from app.sessions import get_session, update_session
from app.config import get_exports_dir

ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

_STRIP_KEYS = {"variantScreenshots", "referenceImagePath", "exportPath"}

MIME_MAP = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
            ".webp": "image/webp", ".gif": "image/gif"}


def _clean_session(session: dict[str, Any]) -> dict[str, Any]:
    """Return session dict without huge binary blobs so it fits Claude's context."""
    return {k: v for k, v in session.items() if k not in _STRIP_KEYS}


def _load_reference_image(session: dict[str, Any]) -> list[dict] | None:
    """If session has a referenceImagePath, load it as a Claude image content block."""
    ref = session.get("referenceImagePath")
    if not ref:
        return None
    p = Path(ref)
    if not p.exists():
        return None
    data = base64.standard_b64encode(p.read_bytes()).decode("ascii")
    mime = MIME_MAP.get(p.suffix.lower(), "image/png")
    return [{"type": "image", "source": {"type": "base64", "media_type": mime, "data": data}}]


def _build_generation_system(session: dict[str, Any]) -> str:
    """Build a poly-level and subject-aware system prompt for variant generation."""
    laf = session.get("lookAndFeel") or {}
    ctx = session.get("context") or {}
    poly = laf.get("polyLevel", "low")
    style = laf.get("style", "")
    vibe = laf.get("vibe", "")
    subject = ctx.get("subject", "character")
    is_human = ctx.get("isHuman", False)
    pose = ctx.get("posePosition", "")

    base = (
        "You are an expert 3D modeler controlling Blender via MCP tools. "
        "Create 3 distinct variants of the requested model, each with meaningfully different "
        "shapes, proportions, or poses. For each variant: build the model, then call "
        "get_viewport_screenshot (max_size=800). Work on one variant at a time.\n\n"
    )

    if poly == "high":
        base += (
            "QUALITY LEVEL: HIGH POLY — production quality.\n"
            "- Use subdivision surface modifiers (level 2-3) for smooth, organic forms.\n"
            "- Add proper edge loops for anatomy, musculature, and realistic proportions.\n"
            "- Create detailed features: fingers, facial structure, clothing folds, accessories.\n"
            "- Use multiple mesh objects for complex parts (body, head, clothing, weapons).\n"
            "- Ensure clean topology with quad-dominant mesh.\n"
            "- Add depth through extruded details, beveled edges, and layered geometry.\n\n"
        )
    elif poly == "mixed":
        base += (
            "QUALITY LEVEL: MIXED POLY — detailed where it matters, simplified elsewhere.\n"
            "- Use higher poly count on focal areas (face, hands, key features).\n"
            "- Keep supporting geometry (base body, simple clothing) at medium detail.\n"
            "- Use subdivision on hero parts only.\n"
            "- Balance visual quality with efficient geometry.\n\n"
        )
    else:
        base += (
            "QUALITY LEVEL: LOW POLY — stylized game-ready models.\n"
            "- Keep vertex counts low, embrace the faceted aesthetic.\n"
            "- Use simple geometric shapes as building blocks.\n"
            "- Charm comes from proportions and silhouette, not detail.\n\n"
        )

    if is_human and subject == "character":
        base += (
            "HUMANOID CHARACTER GUIDELINES:\n"
            "- Start with a properly proportioned base body (7-8 heads tall for realistic, "
            "3-4 heads for chibi/stylized).\n"
            "- Build the body in anatomical sections: torso, limbs, head.\n"
            "- For the torso: create a tapered cylinder, scale for chest/waist/hip ratio.\n"
            "- For limbs: use cylinders with proper joint placement (shoulder, elbow, wrist, "
            "hip, knee, ankle). Taper toward extremities.\n"
            "- For the head: sphere with extruded/shaped facial features.\n"
            "- Hands: simplified palm + finger shapes (detail depends on poly level).\n"
        )
        if pose:
            base += f"- POSE: Position the character in this pose: '{pose}'. Rotate limbs at joints.\n"
        base += (
            "- Ensure the character looks natural from the front AND side views.\n"
            "- Each variant should differ in body proportions, stance, or clothing silhouette.\n\n"
        )
    elif subject == "character":
        base += (
            "CREATURE / NON-HUMAN CHARACTER GUIDELINES:\n"
            "- Start with the creature's core body shape (round, elongated, etc).\n"
            "- Add distinctive features (wings, tail, horns, etc) as separate objects.\n"
        )
        if pose:
            base += f"- POSE: '{pose}'.\n"
        base += "- Each variant should explore different body proportions or feature arrangements.\n\n"

    if style:
        base += f"STYLE: {style}\n"
    if vibe:
        base += f"VIBE/THEME: {vibe}\n"

    return base


def _build_materials_system(session: dict[str, Any]) -> str:
    """Build a context-aware system prompt for materials application."""
    laf = session.get("lookAndFeel") or {}
    ctx = session.get("context") or {}
    vibe = laf.get("vibe", "")
    desc = ctx.get("description", "")

    return (
        "You are an expert 3D artist controlling Blender via MCP. "
        "Apply materials and shaders to every object in the current scene.\n\n"
        "APPROACH:\n"
        "1. First get the scene info to understand what objects exist.\n"
        "2. For each object, create and assign a Principled BSDF material with appropriate:\n"
        "   - Base color matching the object's intended appearance\n"
        "   - Roughness (metallic objects ~0.2-0.4, organic ~0.6-0.9)\n"
        "   - Metallic value where appropriate (armor, weapons = 1.0)\n"
        "3. Use distinct materials for different parts (skin, clothing, metal, etc).\n"
        "4. If Poly Haven textures are available, use them for surfaces that benefit from "
        "realistic texturing (stone, wood, fabric).\n\n"
        f"THEME/VIBE: {vibe}\n"
        f"DESCRIPTION: {desc}\n"
    )


async def _run_claude_mcp_loop(
    mcp,
    client: Anthropic,
    system: str,
    messages: list[dict],
    claude_tools: list[dict],
    max_rounds: int = 20,
    max_tokens: int = 4096,
) -> list[str]:
    """Run the Claude <-> MCP tool loop. Returns list of screenshot data URIs collected."""
    screenshots: list[str] = []
    for _ in range(max_rounds):
        resp = client.messages.create(
            model=ANTHROPIC_MODEL,
            max_tokens=max_tokens,
            system=system,
            messages=messages,
            tools=claude_tools,
        )
        if not resp.content:
            break
        tool_uses = [c for c in resp.content if getattr(c, "type", None) == "tool_use"]
        if not tool_uses:
            break
        messages.append({"role": "assistant", "content": resp.content})
        for block in tool_uses:
            name = getattr(block, "name", None)
            args = getattr(block, "input", None) or {}
            if not name:
                continue
            tool_result = await call_mcp_tool(mcp, name, args)
            for item in (tool_result.get("content") or []):
                if item.get("type") == "image" and "data" in item:
                    screenshots.append(
                        f"data:{item.get('mimeType', 'image/png')};base64,{item['data']}"
                    )
            text_parts = [
                str(item.get("text", ""))
                for item in (tool_result.get("content") or [])
                if item.get("type") == "text"
            ]
            messages.append({
                "role": "user",
                "content": [
                    {
                        "type": "tool_result",
                        "tool_use_id": getattr(block, "id", ""),
                        "content": "\n".join(text_parts) or "Done.",
                    }
                ],
            })
    return screenshots


async def run_step(
    session_id: str,
    step: str,
    data: dict[str, Any],
    session: dict[str, Any],
    api_key: Optional[str] = None,
) -> dict[str, Any]:
    """Execute one wizard step via Claude + MCP tools, update session, return result."""
    session = get_session(session_id) or session
    result: dict[str, Any] = {"session": session, "variantScreenshots": None, "exportPath": None}

    if step == "look_and_feel":
        update_session(session_id, {"currentStep": "context", **data})
        result["session"] = get_session(session_id)
        return result

    if step == "context":
        update_session(session_id, {"currentStep": "reference_image", **data})
        result["session"] = get_session(session_id)
        return result

    if step == "reference_image":
        update_session(session_id, {"currentStep": "generate_variants"})
        result["session"] = get_session(session_id)
        return result

    if step == "generate_variants":
        async with mcp_session() as mcp:
            tools_spec = await list_mcp_tools(mcp)
            claude_tools = [
                {"name": t["name"], "description": t["description"],
                 "input_schema": t.get("input_schema") or {}}
                for t in tools_spec
            ]
            client = Anthropic(api_key=api_key) if api_key else Anthropic()
            system = _build_generation_system(session)
            clean = _clean_session(session)
            ctx = session.get("context") or {}
            desc = ctx.get("description", "")

            user_blocks: list[dict] = []
            ref_blocks = _load_reference_image(session)
            if ref_blocks:
                user_blocks.extend(ref_blocks)
                user_blocks.append({
                    "type": "text",
                    "text": (
                        f"Here is a reference image for the model. Use it as visual guidance "
                        f"for shape, proportions, and style.\n\n"
                        f"Session context: {clean}\n\n"
                        f"Description: {desc}\n\n"
                        f"Create 3 distinct variants and capture a viewport screenshot for each."
                    ),
                })
            else:
                user_blocks.append({
                    "type": "text",
                    "text": (
                        f"Session context: {clean}\n\n"
                        f"Description: {desc}\n\n"
                        f"Create 3 distinct variants and capture a viewport screenshot for each."
                    ),
                })

            messages: list[dict] = [{"role": "user", "content": user_blocks}]
            screenshots = await _run_claude_mcp_loop(
                mcp, client, system, messages, claude_tools, max_rounds=25,
            )

            update_session(session_id, {
                "currentStep": "pick_one",
                "variantScreenshots": screenshots[:3],
            })
            result["session"] = get_session(session_id)
            result["variantScreenshots"] = screenshots[:3]
        return result

    if step == "pick_one":
        update_session(session_id, {
            "currentStep": "materials",
            "selectedVariantIndex": data.get("selectedVariantIndex", 0),
        })
        result["session"] = get_session(session_id)
        return result

    if step == "materials":
        update_session(session_id, {
            "currentStep": "export",
            "materialsRequested": data.get("materialsRequested", False),
        })
        if data.get("materialsRequested"):
            async with mcp_session() as mcp:
                tools_spec = await list_mcp_tools(mcp)
                claude_tools = [
                    {"name": t["name"], "description": t["description"],
                     "input_schema": t.get("input_schema") or {}}
                    for t in tools_spec
                ]
                client = Anthropic(api_key=api_key) if api_key else Anthropic()
                system = _build_materials_system(session)
                clean = _clean_session(session)
                messages: list[dict] = [
                    {"role": "user", "content": f"Scene context: {clean}\n\nApply materials and shaders to all objects."}
                ]
                await _run_claude_mcp_loop(
                    mcp, client, system, messages, claude_tools, max_rounds=15,
                )
        result["session"] = get_session(session_id)
        return result

    if step == "export":
        export_format = data.get("format", "obj") or "obj"
        if export_format not in ("obj", "fbx"):
            export_format = "obj"
        export_dir = get_exports_dir() / session_id
        export_dir.mkdir(parents=True, exist_ok=True)
        ext = "obj" if export_format == "obj" else "fbx"
        export_path = export_dir / f"model.{ext}"

        async with mcp_session() as mcp:
            if export_format == "obj":
                code = f'''
import bpy
path = r"{export_path.as_posix()}"
bpy.ops.wm.obj_export(filepath=path, export_selected_objects=False)
'''
            else:
                code = f'''
import bpy
path = r"{export_path.as_posix()}"
bpy.ops.export_scene.fbx(filepath=path, use_selection=False)
'''
            await call_mcp_tool(mcp, "execute_blender_code", {"code": code})

        update_session(session_id, {"exportFormat": export_format, "exportPath": str(export_path)})
        result["session"] = get_session(session_id)
        result["exportPath"] = str(export_path)
        return result

    update_session(session_id, {"currentStep": step, **data})
    result["session"] = get_session(session_id)
    return result
