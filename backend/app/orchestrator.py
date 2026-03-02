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


def _get_ref_abs_path(session: dict[str, Any]) -> str | None:
    """Return the absolute path to the reference image, if it exists on disk."""
    ref = session.get("referenceImagePath")
    if not ref:
        return None
    p = Path(ref)
    return str(p.resolve()) if p.exists() else None


def _build_generation_system(session: dict[str, Any]) -> str:
    """Build an integration-aware system prompt for variant generation."""
    laf = session.get("lookAndFeel") or {}
    ctx = session.get("context") or {}
    poly = laf.get("polyLevel", "low")
    gen_method = laf.get("generationMethod", "auto")
    style = laf.get("style", "")
    vibe = laf.get("vibe", "")
    subject = ctx.get("subject", "character")
    is_human = ctx.get("isHuman", False)
    pose = ctx.get("posePosition", "")
    desc = ctx.get("description", "")
    has_ref = bool(session.get("referenceImagePath"))

    base = (
        "You are an expert 3D modeler controlling Blender via MCP tools.\n"
        "Your goal: create 3 distinct variants of the requested model.\n"
        "For each variant, build or generate the model, then call "
        "get_viewport_screenshot(max_size=800). Work one variant at a time.\n\n"
    )

    # --- Integration-aware generation strategy ---
    if gen_method == "scripted":
        base += (
            "GENERATION METHOD: SCRIPTED (manual Blender Python code).\n"
            "Build the model using execute_blender_code. Do NOT use AI generation APIs.\n\n"
        )
    elif gen_method == "library":
        base += (
            "GENERATION METHOD: LIBRARY SEARCH.\n"
            "STRATEGY:\n"
            "1. Check get_sketchfab_status() to see if Sketchfab is available.\n"
            "2. If available: search_sketchfab_models() for models matching the description, "
            "then download_sketchfab_model() for the best match.\n"
            "3. Also check get_polyhaven_status() for Poly Haven models.\n"
            "4. After importing, use execute_blender_code to adjust scale, position, and rotation.\n"
            "5. If no suitable library model is found, fall back to AI generation or scripting.\n"
            "6. For each variant, try a different search query or model to get variety.\n\n"
        )
    else:
        base += (
            "GENERATION STRATEGY (follow this priority order):\n\n"
            "1. FIRST, check what integrations are available by calling:\n"
            "   - get_hyper3d_status()\n"
            "   - get_hunyuan3d_status()\n"
            "   - get_sketchfab_status()\n"
            "   - get_polyhaven_status()\n\n"
            "2. USE AI 3D GENERATION when available (produces far better results than scripting):\n"
            "   a) Hyper3D/Rodin (preferred for characters and single objects):\n"
            "      - Text: generate_hyper3d_model_via_text(text_prompt=...)\n"
            "      - Image: generate_hyper3d_model_via_images(input_image_paths=[...])\n"
            "      - Then poll_rodin_job_status() until complete\n"
            "      - Then import_generated_asset() to bring it into Blender\n"
            "      - The generated model has built-in materials and normalized size\n"
            "      - After import, ALWAYS check world_bounding_box and adjust scale/position\n"
            "   b) Hunyuan3D (alternative):\n"
            "      - generate_hunyuan3d_model(text_prompt=...) or with image\n"
            "      - poll_hunyuan_job_status() until done\n"
            "      - import_generated_asset_hunyuan()\n\n"
            "3. USE LIBRARY SEARCH for existing real-world objects:\n"
            "   - Sketchfab: search_sketchfab_models() then download_sketchfab_model()\n"
            "   - Poly Haven: search_polyhaven_assets() then download_polyhaven_asset()\n\n"
            "4. FALL BACK TO SCRIPTING only when:\n"
            "   - All AI generation tools are disabled/unavailable\n"
            "   - A simple primitive is requested\n"
            "   - AI generation failed\n\n"
            "5. AFTER generation/import, use execute_blender_code for:\n"
            "   - Adjusting scale, position, rotation\n"
            "   - Combining parts, adding accessories\n"
            "   - Posing (if applicable)\n\n"
            "IMPORTANT: For each of the 3 variants, vary the text prompt or search query "
            "to get meaningfully different results. Clear the scene between variants.\n\n"
        )

    # --- Reference image instructions ---
    if has_ref:
        ref_path = _get_ref_abs_path(session)
        if ref_path:
            base += (
                "REFERENCE IMAGE AVAILABLE:\n"
                f"The user uploaded a reference image at: {ref_path}\n"
                "- If Hyper3D is available, use generate_hyper3d_model_via_images("
                f'input_image_paths=["{ref_path}"]) for at least one variant.\n'
                "- For other variants, use text-based generation with descriptions inspired by the reference.\n"
                "- The reference image is also shown to you directly for visual context.\n\n"
            )

    # --- Poly level ---
    if poly == "high":
        base += (
            "QUALITY LEVEL: HIGH POLY — production quality.\n"
            "- When using AI generation, this is handled automatically.\n"
            "- When scripting: use subdivision surface modifiers (level 2-3), "
            "proper edge loops, detailed anatomy, quad-dominant mesh.\n\n"
        )
    elif poly == "mixed":
        base += (
            "QUALITY LEVEL: MIXED POLY — detailed where it matters.\n"
            "- When using AI generation, request detailed models.\n"
            "- When scripting: high detail on focal areas, medium elsewhere.\n\n"
        )
    else:
        base += (
            "QUALITY LEVEL: LOW POLY — stylized game-ready.\n"
            "- When using AI generation, add 'low poly' to the prompt.\n"
            "- When scripting: embrace faceted aesthetic, simple shapes.\n\n"
        )

    # --- Subject-specific ---
    if is_human and subject == "character":
        base += (
            "SUBJECT: HUMANOID CHARACTER\n"
            "- AI generation excels at humanoids — always prefer it when available.\n"
            "- Include pose/clothing/style details in the generation prompt.\n"
        )
        if pose:
            base += f"- REQUESTED POSE: '{pose}'\n"
        base += "\n"
    elif subject == "character":
        base += "SUBJECT: CREATURE / NON-HUMAN CHARACTER\n"
        if pose:
            base += f"- REQUESTED POSE: '{pose}'\n"
        base += "\n"

    if style:
        base += f"STYLE: {style}\n"
    if vibe:
        base += f"VIBE/THEME: {vibe}\n"
    if desc:
        base += f"DESCRIPTION: {desc}\n"

    return base


def _build_materials_system(session: dict[str, Any]) -> str:
    """Build a context-aware system prompt for materials application."""
    laf = session.get("lookAndFeel") or {}
    ctx = session.get("context") or {}
    vibe = laf.get("vibe", "")
    desc = ctx.get("description", "")

    return (
        "You are an expert 3D artist controlling Blender via MCP.\n"
        "Apply materials and shaders to every object in the current scene.\n\n"
        "STRATEGY (follow this priority):\n"
        "1. First call get_polyhaven_status() to check if Poly Haven textures are available.\n"
        "2. Call get_scene_info() to understand what objects exist.\n\n"
        "IF POLY HAVEN IS AVAILABLE:\n"
        "- Use search_polyhaven_assets(asset_type='textures', query='...') to find PBR textures.\n"
        "- Use download_polyhaven_asset() to download and apply them.\n"
        "- Use set_texture() to apply textures to specific objects.\n"
        "- Match textures to the theme: metal textures for armor, fabric for clothing, etc.\n"
        "- For environment lighting, consider downloading an HDRI.\n\n"
        "IF POLY HAVEN IS NOT AVAILABLE (fallback):\n"
        "- Use execute_blender_code to create Principled BSDF materials.\n"
        "- Set base color, roughness, metallic values appropriate to each surface.\n"
        "- Use distinct materials for different parts (skin, clothing, metal, etc).\n\n"
        "GENERAL GUIDELINES:\n"
        "- Metallic objects (armor, weapons): metallic=1.0, roughness=0.2-0.4\n"
        "- Organic surfaces (skin, fabric): metallic=0.0, roughness=0.6-0.9\n"
        "- Note: if the model was AI-generated, it may already have materials — "
        "check first and only add/improve where needed.\n\n"
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
            ref_path = _get_ref_abs_path(session)
            if ref_blocks:
                user_blocks.extend(ref_blocks)
                ref_note = (
                    "Here is a reference image for the model. Use it as visual guidance "
                    "for shape, proportions, and style.\n"
                )
                if ref_path:
                    ref_note += (
                        f"The reference image file is at: {ref_path}\n"
                        "If Hyper3D image-to-3D is available, use "
                        f'generate_hyper3d_model_via_images(input_image_paths=["{ref_path}"]) '
                        "for at least one variant.\n"
                    )
                user_blocks.append({
                    "type": "text",
                    "text": (
                        f"{ref_note}\n"
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
                mcp, client, system, messages, claude_tools,
                max_rounds=40, max_tokens=4096,
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
