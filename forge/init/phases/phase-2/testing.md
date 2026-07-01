<!-- kb-doc-fragment: testing -->
# Substance — `architecture/testing`

**Output path:** `{kbFolder}/architecture/testing.md`

**Topic focus:** the test strategy — frameworks and runners, the exact command
to run the suite, test layout (unit/integration/e2e), and coverage tooling.
Describe *how the project is verified*.

**Discovery input to read:** the `testing` domain findings from Phase 1 (test
directories, test frameworks, runner config, coverage config). Cross-reference
`stack` for the runner dependency version.

**Required output:**
- Confidence header on line 1.
- Test framework(s) and the resolved run command (from `commands.test`).
- Test layout and naming conventions.
- Coverage tool and threshold, if any.
- No CI wiring — that is `deployment`.

**Not applicable:** if the project has no tests, write: `No test suite detected —
this project currently has no automated tests.` and set confidence low.
