# ai-pm-skills

AI-PM skill (`SKILL.md` + `references/`) and the AI-PM remote MCP server, packaged as a Claude Code plugin.

## Claude Code

```text
/plugin marketplace add duongtx90/ai-pm-skills
/plugin install ai-pm@ai-pm
```

Claude Code asks for your agent token (`ag_live_...`, created in AI-PM → Agents) and keeps it in the system credential store. Change it later with `/plugin configure ai-pm@ai-pm`. Updates: `/plugin marketplace update ai-pm`, or enable auto-update for the marketplace in `/plugin`.

If you added the MCP server by hand before (`ai-pm-mcp` in `.mcp.json` or `claude mcp add`), remove it so the tools are not listed twice.
