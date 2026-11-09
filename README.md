# Patto plugins

Plugins that connect Claude, ChatGPT and Codex to [Patto](https://pattorelay.com), the outreach and campaign infrastructure for your AI: contacts, campaigns, follow-ups and sending from your own mailbox.

Both plugins carry one `setup` skill and a reference to Patto's remote MCP server at `https://pattorelay.com/mcp` (OAuth with dynamic client registration). Nothing runs on your machine. The server's source is not in this repository.

## Layout

| Path | What |
|---|---|
| `plugins/claude/` | Claude plugin (Anthropic's plugin directory, Claude Code) |
| `plugins/openai/` | OpenAI plugin (OpenAI's plugin directory for ChatGPT and Codex) |
| `.claude-plugin/marketplace.json` | Claude Code marketplace, lists `plugins/claude` |
| `scripts/check.mjs` | Release check |

## Install

Claude Code:

```
/plugin marketplace add pattorelay/patto
/plugin install patto@patto
```

Claude apps: Customize → Plugins. ChatGPT and Codex: OpenAI's plugin directory.

There is deliberately no Codex marketplace in this repository. `plugins/openai/mcp.json` declares OAuth with dynamic client registration under `extensions["com.openai"].auth`, which is where OpenAI's portal reads it. Codex's own loader for local and GitHub marketplaces rejects that field and drops the server without a warning (checked with Codex 0.163), while the portal converts the package for Codex.

## Releasing

1. Raise `version` in the manifest of the package you change (`plugins/claude/.claude-plugin/plugin.json` or `plugins/openai/plugin.json`).
2. Run `node scripts/check.mjs` (Node 18 or later). It checks that both packages point at the MCP server the MCP registry lists for `com.pattorelay/patto`, that steps 3 and 4 of `https://pattorelay.com/onboarding.md` appear word for word in both `setup` skills, that the Claude Code marketplace points at its package, and, with Claude Code installed, runs `claude plugin validate` in strict mode and with the directory profile.
3. Claude: push to `main`, then publish the version in Anthropic's portal. The submission names repository `pattorelay/patto`, branch `main` and plugin path `plugins/claude`; the MCP server is submitted to the directory as a connector of its own.
4. OpenAI: build a fresh ZIP and upload it in OpenAI's portal as a plugin **with MCP**, not skills only:

   ```
   rm -f patto-openai-plugin.zip
   (cd plugins/openai && zip -r -X ../../patto-openai-plugin.zip . -x '.*' '*/.*')
   ```

## License

MIT, see `LICENSE`.
