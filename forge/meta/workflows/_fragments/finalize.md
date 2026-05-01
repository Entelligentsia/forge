## Finalize: Token Reporting and Sidecar Emission

Before returning, every subagent MUST:

1. Run `/cost` to retrieve session token usage.
2. Parse the output for five fields: `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `estimatedCostUSD`.
   - If `/cost` succeeds, add `"tokenSource": "reported"` to the sidecar JSON.
   - If `/cost` fails or is unavailable, set all token fields to `null` and add `"tokenSource": "missing"`.
3. Write the usage sidecar via `/forge:store emit {sprintId} '{sidecar-json}' --sidecar` with format:
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
