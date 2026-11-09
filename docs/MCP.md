# Kairos MCP server

Kairos ships a [Model Context Protocol](https://modelcontextprotocol.io) server at **`/api/mcp`**. Connecting it gives any MCP-capable assistant (ChatGPT, Claude, Cursor, Zed, Continue, …) the same ADHD-aware behaviours the app uses: tiny first steps, time anchors, no shame.

- Transport: **Streamable HTTP**, stateless (no sessions, no storage)
- URL: `https://<your-deployment>/api/mcp` (or `http://localhost:3000/api/mcp` in dev)
- Auth: none by default — add your own middleware if you deploy it publicly and want to restrict it

## What the assistant gets

### Tools

| Tool | Input | Returns |
|------|-------|---------|
| `break_down_task` | `title`, optional `context`, `steps` (3–5) | Micro-steps; the first is trivially easy. Also `firstStepOnly`. |
| `plan_focus_block` | `task`, `energy` low/medium/high, `availableMinutes` | Block length, step to work on, break suggestion, a "just start" line |
| `reframe_self_talk` | `thought` | A compassionate, still-honest reframe plus a tiny next action |
| `pick_break` | `minutes`, `mood` optional | 2–3 pre-decided break ideas sized to the time |
| `estimate_time` | `task`, `userGuessMinutes` optional | A realistic range, a "time anchor", the typical ADHD multiplier |
| `parking_lot_triage` | `thoughts[]` | Sorted into do-after-focus / schedule / let-go, with one-line reasons |
| `study_plan_from_material` | `kind` video/pdf/text, `lengthOrPages`, `goal` optional | Chunked study plan with recall prompts |
| `make_speedbump` | `paragraph`, `kind` type/drag optional | Kinetic Reading check: the sentence with a gap, the answer (for the assistant), and three distractors |

All tools are annotated `readOnlyHint: true` — they never change anything.

### Prompts

| Prompt | Arguments | Use |
|--------|-----------|-----|
| `adhd_aware_assistant` | — | System-style instructions that make the assistant communicate the Kairos way (short, next-step-first, no shame) |
| `body_double_session` | `task`, `minutes` | Turns the assistant into a quiet body-double for a focus block |
| `unstick_me` | `task`, `feeling` optional | Get from stuck to the first two-minute action |

### Resources

| URI | Contents |
|-----|----------|
| `kairos://guide/communication` | How to talk to someone with ADHD when they're trying to work |
| `kairos://guide/principles` | The product's design principles, for assistants that generate plans or UI |

## Connecting

### ChatGPT (Connectors / Developer mode)

1. Deploy Kairos (Vercel or anywhere Node runs) so the URL is HTTPS and public.
2. In ChatGPT: **Settings → Connectors → Create** (requires developer mode / a plan that allows custom MCP connectors).
3. Name: `Kairos`. MCP server URL: `https://<your-deployment>/api/mcp`. Authentication: none.
4. Enable the connector in a chat. Try: *"Use break_down_task on 'write lit review' and give me only the first step."*

### Claude (Desktop / claude.ai)

**claude.ai / Claude Desktop (remote connector):** Settings → Connectors → Add custom connector → URL `https://<your-deployment>/api/mcp`.

**Claude Desktop config (stdio bridge, works with localhost):**

```json
{
  "mcpServers": {
    "kairos": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "http://localhost:3000/api/mcp"]
    }
  }
}
```

### Cursor

`.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global):

```json
{
  "mcpServers": {
    "kairos": {
      "url": "http://localhost:3000/api/mcp"
    }
  }
}
```

### Any other client

Use the URL directly if the client speaks Streamable HTTP; otherwise bridge with `npx -y mcp-remote <url>`.

## Testing with curl

```bash
curl -s http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"0"}}}'

curl -s http://localhost:3000/api/mcp \
  -H 'content-type: application/json' \
  -H 'accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"break_down_task","arguments":{"title":"study for midterm"}}}'
```

## Extending

Tools, prompts and resources are declared in `src/mcp/server.ts`; the communication guide and reframe patterns live in `src/mcp/knowledge.ts`. The server is created by `mcp-handler`'s `createMcpHandler` in `src/app/api/mcp/route.ts`. Add a tool with `server.registerTool(name, { description, inputSchema, annotations }, handler)` using Zod schemas; return both `content` (text) and `structuredContent` so clients can use either.

## Privacy

The server has no database and no access to the user's browser data. Each request is processed and forgotten. Tool inputs are whatever the assistant chooses to send.
