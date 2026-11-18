# ai-pm-skills

AI-PM skill (`SKILL.md` + `references/`) and the AI-PM remote MCP server, packaged for Claude Code, Codex, Antigravity and Reasonix.

## Claude Code

```text
/plugin marketplace add duongtx90/ai-pm-skills
/plugin install ai-pm@ai-pm
```

Claude Code asks for your agent token (`ag_live_...`, created in AI-PM → Agents) and keeps it in the system credential store. Change it later with `/plugin configure ai-pm@ai-pm`. Updates: `/plugin marketplace update ai-pm`, or enable auto-update for the marketplace in `/plugin`.

If you added the MCP server by hand before (`ai-pm-mcp` in `.mcp.json` or `claude mcp add`), remove it so the tools are not listed twice.

## All agents (Claude Code, Codex, Antigravity, Reasonix)

Put `export AIPM_TOKEN=ag_live_...` in your shell profile (Codex reads it at run time), open a new terminal, then:

```bash
curl -fsSL https://raw.githubusercontent.com/duongtx90/ai-pm-skills/main/install.sh | sh
```

Installs the skill once in `~/.agents/skills/ai-pm-skills` and links it into each agent found, installs the Claude Code plugin, and adds the MCP server where it is missing (an existing entry for the AI-PM URL is kept). Old hand-copied skill folders are moved to `~/.aipm/backup/`. Re-run to update; `sh install.sh --uninstall` removes it. Needs Node.js (`npx`).
