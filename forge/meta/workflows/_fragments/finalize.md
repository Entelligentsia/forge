## Finalize: Token Reporting and Sidecar Emission

Before returning, every subagent MUST:

1. Probe session token usage: invoke `/cost` if the host runtime supports it
   (Claude Code only); on any other runtime treat as unavailable. Do NOT shell
   out to a `cost-cli.cjs` — there is no such tool.
2. Parse the output for five fields: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
   - If the probe succeeds, add `"tokenSource": "reported"` to the sidecar JSON.
   - If the probe fails or is unavailable, set all token fields to `null` and add `"tokenSource": "missing"`.
3. Write the usage sidecar via `node "$FORGE_ROOT/tools/store-cli.cjs" emit {sprintId} '{sidecar-json}' --sidecar` with format:
   ```json
   {
     "eventId": "<eventId passed by orchestrator>",
     "inputTokens": <integer or null>,
     "outputTokens": <integer or null>,
     "cacheReadTokens": <integer or null>,
     "cacheWriteTokens": <integer or null>,
     "estimatedCostUSD": <number or null>,
     "tokenSource": "reported" | "missing"
   }
   ```
4. **NEVER skip sidecar write.** Always emit (with reported data or with nulls).

The `eventId` is passed by the orchestrator in the subagent prompt. If unavailable, derive from context.
