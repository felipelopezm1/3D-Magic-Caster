"""MCP client that spawns blender-mcp (uvx) and calls its tools."""
import os
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

MCP_COMMAND = os.environ.get("MCP_COMMAND", "uvx")
MCP_ARGS = os.environ.get("MCP_ARGS", "blender-mcp").split()
BLENDER_HOST = os.environ.get("BLENDER_HOST", "localhost")
BLENDER_PORT = os.environ.get("BLENDER_PORT", "9876")


@asynccontextmanager
async def mcp_session() -> AsyncIterator[ClientSession]:
    """Yield an MCP ClientSession connected to blender-mcp via stdio."""
    env = os.environ.copy()
    env["BLENDER_HOST"] = BLENDER_HOST
    env["BLENDER_PORT"] = BLENDER_PORT
    params = StdioServerParameters(
        command=MCP_COMMAND,
        args=MCP_ARGS,
        env=env,
    )
    async with stdio_client(params) as (read_stream, write_stream):
        async with ClientSession(read_stream, write_stream) as session:
            await session.initialize()
            yield session


async def list_mcp_tools(session: ClientSession) -> list[dict[str, Any]]:
    """Return list of tools with name, description, inputSchema."""
    result = await session.list_tools()
    return [
        {
            "name": t.name,
            "description": t.description or "",
            "input_schema": t.inputSchema,
        }
        for t in result.tools
    ]


async def call_mcp_tool(
    session: ClientSession,
    name: str,
    arguments: dict[str, Any],
) -> dict[str, Any]:
    """Call an MCP tool and return content + isError. Content items may be text or image (base64)."""
    result = await session.call_tool(name, arguments)
    # Serialize content for Claude: text blocks as text, image as base64 or URL
    content_list: list[dict] = []
    if result.content:
        for block in result.content:
            if hasattr(block, "type"):
                if block.type == "text" and getattr(block, "text", None):
                    content_list.append({"type": "text", "text": block.text})
                elif block.type == "image" and getattr(block, "data", None):
                    data = block.data
                    if isinstance(data, bytes):
                        import base64
                        data = base64.standard_b64encode(data).decode("ascii")
                    content_list.append({"type": "image", "data": data, "mimeType": getattr(block, "mimeType", "image/png")})
    return {"content": content_list, "isError": result.isError}
