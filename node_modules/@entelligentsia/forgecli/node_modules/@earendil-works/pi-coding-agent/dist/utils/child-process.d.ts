import { type ChildProcess, type ChildProcessByStdio, type SpawnOptions, type SpawnOptionsWithStdioTuple, type SpawnSyncOptionsWithStringEncoding, type SpawnSyncReturns, type StdioNull, type StdioPipe } from "node:child_process";
import type { Readable } from "node:stream";
export declare function spawnProcess(command: string, args: string[], options: SpawnOptionsWithStdioTuple<StdioNull, StdioPipe, StdioPipe>): ChildProcessByStdio<null, Readable, Readable>;
export declare function spawnProcess(command: string, args: string[], options: SpawnOptions): ChildProcess;
export declare function spawnProcessSync(command: string, args: string[], options: SpawnSyncOptionsWithStringEncoding): SpawnSyncReturns<string>;
/**
 * Wait for a child process to terminate without hanging on inherited stdio handles.
 *
 * On Windows, daemonized descendants can inherit the child's stdout/stderr pipe
 * handles. In that case the child emits `exit`, but `close` can hang forever even
 * though the original process is already gone. We wait briefly for stdio to end,
 * then forcibly stop tracking the inherited handles.
 */
export declare function waitForChildProcess(child: ChildProcess): Promise<number | null>;
//# sourceMappingURL=child-process.d.ts.map