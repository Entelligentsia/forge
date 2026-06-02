## Security Scan — forge:forge — 2026-06-02

**SHA**: f1246584 (v1.1.2 release commit) | **Installed**: n/a (in-tree source scan) | **Last updated**: 2026-06-02
**Scope**: source — `forge/forge/` (plugin payload) | **Install path**: `/home/boni/src/forge-engineering/forge/forge/`

### Summary
407 files scanned | 0 critical | 0 warnings | 1 info

### Scan basis

v1.1.2 is a single-defect bug-fix release. The only code delta versus the
previously-scanned baseline is one function in `forge/tools/collate.cjs`
(`resolveTaskDir`), plus its regression tests, the `migrations.json` entry, and
the `plugin.json` / `integrity.json` version strings. Every other byte of the
407-file plugin payload is unchanged. The scan therefore focuses on the
changed surface, with a structural sweep of the whole payload.

### Findings

#### [INFO] forge/tools/collate.cjs:108–130
- **Check**: A — tool script behaviour
- **Issue**: The changed `resolveTaskDir` adds two local filesystem reads
  (`fs.existsSync` + `fs.statSync`) on a path built from `sprintDirPath` (config-
  derived engineering root) joined with `path.basename(task.path)`. `basename`
  strips any directory component, so the join cannot traverse outside
  `sprintDirPath`. No network, no `eval`/`exec`/`child_process`, no credential
  or environment access, no new permissions, hooks, or commands.
- **Excerpt**: `const candidatePath = path.join(sprintDirPath, candidate); if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) { return resultOk(candidate); }`
- **Recommendation**: Safe. Read-only stat of a basename-bounded local path; no
  expansion of the tool's existing filesystem surface.

### Clean Areas
- `forge/hooks/` — unchanged since v1.1.1 baseline; no network calls, no
  credential reads, no eval, no persistence mechanisms.
- `forge/commands/`, `forge/meta/`, `forge/skills/`, `forge/personas/` — no
  prompt-injection strings, persona hijacking, hidden instructions, or
  zero-width Unicode introduced; unchanged from baseline.
- `forge/.claude-plugin/plugin.json`, `forge/migrations.json` — version/migration
  metadata only; no permission changes, no unrestricted `allowed-tools`.
- Structural — 407 text files, 4.0M payload, no binaries or compiled artifacts
  (`.pyc`/`.so`/`.exe`/`.dll`/`.class`/`.dylib`), no misleading extensions.

### Verdict

**SAFE TO USE**

v1.1.2 changes one tool function to a stricter, read-only local directory check.
No new external surface, no injection vectors, no permission escalation. Plugin
payload otherwise identical to the v1.1.x baseline.
