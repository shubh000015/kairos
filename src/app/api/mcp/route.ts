import { createMcpHandler } from "mcp-handler";
import { registerQuietFocus } from "@/mcp/server";

/**
 * Streamable-HTTP MCP endpoint: POST /api/mcp
 * Connect from ChatGPT (Connectors), Claude, Cursor, or any MCP client.
 * Stateless — no sessions, no storage, no access to the user's browser data.
 */
const handler = createMcpHandler(registerQuietFocus, {
  serverInfo: { name: "kairos", version: "0.2.0" },
});

export { handler as GET, handler as POST, handler as DELETE };
