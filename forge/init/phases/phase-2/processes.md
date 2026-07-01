<!-- kb-doc-fragment: processes -->
# Substance — `architecture/processes`

**Output path:** `{kbFolder}/architecture/processes.md`

**Topic focus:** the runnable processes and build/deploy topology — services,
daemons, workers, entry points, and the commands that build, start, and run
them. Describe *what runs* and *how it is built*, not the deployment targets.

**Discovery input to read:** the `processes` domain findings from Phase 1
(entry points, scripts, service definitions, build commands). Cross-reference
`stack` for the build tool.

**Required output:**
- Confidence header on line 1.
- Each service/process with its entry point and start command.
- Build pipeline steps in order.
- Inter-process relationships (who calls/spawns whom), if any.
- No CI/CD or environment content — that is `deployment`.

**Not applicable:** if the project defines no runnable processes (e.g. a library
with no service), write: `No standalone processes — this is a library/package
consumed by other code.` and set confidence accordingly.
