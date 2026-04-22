# FORGE-BUG-014: Permission Prompt Storm — Fix Plan

**Status:** Planning
**Priority:** P0 — blocks all Forge usage without `--dangerously-skip-permissions`
**Approaches Evaluated:** 4 (1 selected, 3 rejected)

## Approach Evaluation

### Approach 1: PermissionRequest Hook (SELECTED)

**Mechanism:** Add a `PermissionRequest` hook to `hooks/hooks.json` that intercepts every permission prompt, matches Forge tool patterns, and returns `{ behavior: "allow", updatedPermissions: [...] }` to auto-approve and persist allow rules.

**How it works:**
1. Claude Code fires `PermissionRequest` event when any tool call needs approval
2. Hook script receives JSON on stdin with `tool_name`, `tool_input`, `permission_suggestions`
3. Script matches against known Forge patterns (node tools, shell commands, write paths)
4. Returns `{ behavior: "allow" }` for matches, exits 0 without output for non-matches
5. On first match, includes `updatedPermissions` with `addRules` entries pointing to `localSettings`
6. Subsequent calls for same pattern skip the prompt entirely (rule persisted)

**Pros:**
- Uses official Claude Code hook mechanism — no hacky settings.json writing
- Rules persist after first approval (user sees "always allow" once per pattern)
- `deny` rules still take precedence — security model preserved
- `$CLAUDE_PLUGIN_ROOT` resolves dynamically at hook runtime
- Works across all distribution channels (forge@forge, skillforge, local)
- No changes to command/workflow source needed — purely additive

**Cons:**
- First run still shows one prompt per pattern type before rules persist
- Hook script needs to parse JSON stdin and match patterns — moderate complexity
- `updatedPermissions` destination `localSettings` writes to `.claude/settings.local.json` — user may not expect this

**Estimated prompts eliminated:** ~90% (all node tools, shell commands, write/edit to .forge/, WebFetch)
**First-run prompts:** ~15-20 (one per distinct rule pattern before persistence)

### Approach 2: SessionStart Hook Writes settings.local.json (REJECTED)

**Mechanism:** Extend `check-update.js` to write permission allow rules into `.claude/settings.local.json` at session start.

**Why rejected:**
- Claude Code doesn't officially support plugins writing to settings files
- Race condition: settings may be read before hook completes
- No merge logic — could clobber user's existing settings
- `.claude/settings.local.json` is gitignored — rules would be per-project, not per-user
- No user consent flow — silently adding allow rules is a security concern

### Approach 3: Ship allow Rules in Plugin settings.json (REJECTED)

**Mechanism:** Add `permissions.allow` array to `forge/.claude-plugin/plugin.json` or a `forge/settings.json`.

**Why rejected:**
- Plugin `settings.json` only supports `agent` and `subagentStatusLine` keys
- `permissions` key is not recognized in plugin settings context
- Would require Claude Code to merge plugin-declared permissions into user settings — not implemented

### Approach 4: Rewrite All Commands to Avoid Permission Prompts (REJECTED)

**Mechanism:** Replace every `node "$FORGE_ROOT/tools/..."` call with `node -e` inline, eliminate all compound shell operations, move all file writes to a single consolidated tool call.

**Why rejected:**
- 429 variable references, 256 node calls, 80+ compound operations — massive rewrite
- Some compound patterns are intrinsic to the workflow logic (fallbacks, conditionals)
- Would make commands much harder to read and maintain
- Doesn't solve Write/Edit permission prompts for workflow artifacts
- Even `node -e "..."` still triggers Bash approval unless allow rule exists

## Selected Approach: PermissionRequest Hook

### Implementation

#### New file: `forge/hooks/forge-permissions.js`

```javascript
#!/usr/bin/env node
// PermissionRequest hook for Forge plugin
// Auto-approves known Forge tool patterns and persists allow rules

const FORGE_PATTERNS = {
  Bash: [
    // Node tool invocations
    /^node\s+.*\/tools\/.*\.cjs/,
    /^node\s+-e\s+/,
    /^node\s+-p\s+/,
    // Shell commands used by Forge workflows
    /^mkdir\s+-p\s+/,
    /^cp\s+/,
    /^ls\s+/,
    /^cat\s+/,
    /^date\s+/,
    /^jq\s+/,
    /^touch\s+/,
    /^rm\s+-f\s+/,
    /^uname\s+/,
    // gh commands (report-bug)
    /^gh\s+auth\s+/,
    /^gh\s+issue\s+/,
  ],
  Write: [
    /^\.forge\//,
    /^\.claude\/commands\//,
    /^engineering\//,
  ],
  Edit: [
    /^\.forge\//,
    /^\.claude\/commands\//,
  ],
  WebFetch: [
    /^https:\/\/raw\.githubusercontent\.com\/Entelligentsia\/forge\//,
  ],
};

// Permission rules to persist on first approval
const PERSISTED_RULES = [
  { toolName: "Bash", ruleContent: "node ~/.claude/plugins/cache/forge/forge/*/tools/*" },
  { toolName: "Bash", ruleContent: "node -e *" },
  { toolName: "Bash", ruleContent: "node -p *" },
  { toolName: "Bash", ruleContent: "mkdir -p .forge/*" },
  { toolName: "Bash", ruleContent: "cp */schemas/*.schema.json .forge/schemas/" },
  { toolName: "Bash", ruleContent: "ls *" },
  { toolName: "Bash", ruleContent: "cat .forge/*" },
  { toolName: "Bash", ruleContent: "date -u *" },
  { toolName: "Bash", ruleContent: "jq *" },
  { toolName: "Bash", ruleContent: "gh auth status *" },
  { toolName: "Bash", ruleContent: "gh issue create *" },
  { toolName: "Write", ruleContent: ".forge/**" },
  { toolName: "Write", ruleContent: ".claude/commands/**" },
  { toolName: "Write", ruleContent: "engineering/**" },
  { toolName: "Edit", ruleContent: ".forge/**" },
  { toolName: "Edit", ruleContent: ".claude/commands/**" },
  { toolName: "WebFetch", ruleContent: "domain:raw.githubusercontent.com" },
];

function matchPatterns(toolName, toolInput) {
  const patterns = FORGE_PATTERNS[toolName];
  if (!patterns) return false;

  const input = toolName === "Bash" ? toolInput.command || ""
    : toolName === "Write" || toolName === "Edit" ? toolInput.file_path || ""
    : toolName === "WebFetch" ? toolInput.url || ""
    : "";

  return patterns.some(p => p.test(input));
}

// Main
let input = "";
process.stdin.on("data", d => { input += d; });
process.stdin.on("end", () => {
  try {
    const event = JSON.parse(input);
    const { tool_name, tool_input, permission_suggestions } = event;

    if (matchPatterns(tool_name, tool_input || {})) {
      const response = {
        hookSpecificOutput: {
          hookEventName: "PermissionRequest",
          decision: {
            behavior: "allow",
            updatedPermissions: [{
              type: "addRules",
              rules: PERSISTED_RULES,
              behavior: "allow",
              destination: "localSettings"
            }]
          }
        }
      };
      process.stdout.write(JSON.stringify(response));
      process.exit(0);
    }
    // Not a Forge pattern — let normal permission flow handle it
    process.exit(0);
  } catch (e) {
    // Parse error — don't block, let normal flow proceed
    process.exit(0);
  }
});
```

#### Updated `forge/hooks/hooks.json`

Add `PermissionRequest` matcher alongside existing hooks:

```json
{
  "hooks": {
    "SessionStart": [...],
    "PreToolUse": [...],
    "PostToolUse": [...],
    "PermissionRequest": [
      {
        "matcher": "Bash|Write|Edit|WebFetch",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/forge-permissions.js\"",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
```

### First-Run Behavior

On first Forge command after install:
1. Each distinct tool pattern triggers `PermissionRequest` once
2. Hook auto-approves and persists allow rules to `.claude/settings.local.json`
3. All subsequent calls for matched patterns skip the prompt entirely

Expected first-run prompts: ~17 (one per rule in `PERSISTED_RULES`)
Expected subsequent prompts: 0 for Forge patterns

### Security Model

- `deny` rules always take precedence — user/org deny rules cannot be overridden by hook
- Hook can only `allow`, never `deny`
- Rules persist to `localSettings` (`.claude/settings.local.json`) — gitignored, per-project
- User can inspect/remove rules via `/permissions`
- Hook script is deterministic — no network calls, no dynamic code execution

### Compound Command Handling

The `PermissionRequest` hook matches on individual tool calls, not compound commands. When Claude Code encounters `cd "$PROJECT_ROOT" && node "$FORGE_ROOT/tools/validate-store.cjs"`:
1. Claude Code splits this into subcommands
2. Each subcommand triggers its own `PermissionRequest` event
3. `cd` (read-only) → no prompt
4. `node "$FORGE_ROOT/tools/validate-store.cjs"` → hook approves

This means compound commands still benefit from the hook — each subcommand is evaluated independently.

### Remaining Prompts (Not Eliminated by Hook)

| Pattern | Why not covered | Fix |
|---------|----------------|-----|
| `$FORGE_ROOT` variable expansion in Bash blocks | Variable expansion happens before tool call — not a PermissionRequest | Source fix: replace `$FORGE_ROOT` with `$CLAUDE_PLUGIN_ROOT` or resolved paths (separate change) |
| `2>/dev/null || echo "..."` compound syntax | Claude Code rejects as "multiple operations" before PermissionRequest fires | Source fix: move error handling into `node -e` try/catch (Prong 2 from ANALYSIS.md) |
| `[ -d ... ] && echo YES \|\| echo NO` in frontmatter | Compound conditional rejected before hook | Source fix: split into separate steps or use `node -e` |
| Write/Edit to `CLAUDE.md`, `AGENTS.md` | Outside `.forge/` and `.claude/commands/` paths | Low priority — only 2 files, infrequent writes |

### Migration Notes

Add to `forge/migrations.json`:
```json
{
  "0.25.0": {
    "version": "0.26.0",
    "date": "2026-04-23",
    "notes": "Permission prompt storm fix: new PermissionRequest hook auto-approves known Forge tool patterns. First run shows ~17 prompts (one per pattern), then rules persist. Eliminates 80+ prompts per command.",
    "regenerate": ["hooks"],
    "breaking": false,
    "manual": ["After updating, restart Claude Code for the new hook to take effect. On first Forge command, you will see ~17 permission prompts — approve each and they will persist for future sessions."]
  }
}
```

`regenerate: ["hooks"]` because `hooks.json` changes.

### Test Plan

1. Install Forge without `--dangerously-skip-permissions`
2. Run `/forge:health` — should show ~5-8 prompts on first run, 0 on second
3. Run `/forge:update` — should show ~15-17 prompts on first run, 0 on second
4. Verify `.claude/settings.local.json` contains allow rules after first run
5. Verify `/permissions` shows Forge allow rules
6. Verify deny rules still block (add `deny: ["Bash(rm *)"]` and confirm `rm` still prompts)
7. Verify `/forge:report-bug` no longer fails on `gh auth status`