import EventEmitter, { EventMap } from 'bare-events'
import Buffer from 'bare-buffer'
import Pipe from 'bare-pipe'
import SubprocessChannel from './lib/channel'
import constants from './lib/constants'
import errors from './lib/errors'

export { constants, errors, type SubprocessChannel }

export interface SubprocessEvents extends EventMap {
  exit: [code: number | null, signalCode: string | null]
  message: [message: unknown, handle: unknown]
  /** Close the IPC channel. A `'disconnect'` event is emitted once the channel is fully closed. */
  disconnect: []
  error: [err: Error]
}

export type IO = 'inherit' | 'pipe' | 'overlapped' | 'ignore' | 'ipc'

export interface Subprocess<M extends SubprocessEvents = SubprocessEvents> extends EventEmitter<M> {
  /** The exit code of the child, or `null` if the child has not exited or was terminated by a signal. */
  readonly exitCode: number | null
  /** `true` if `subprocess.kill()` has been called, otherwise `false`. */
  readonly killed: boolean
  /** The process ID of the child. */
  readonly pid: number
  /** The name of the signal the child was terminated with, or `null`. */
  readonly signalCode: string | null
  /** The arguments the child was spawned with. */
  readonly spawnargs: string[]
  /** The file that was spawned. */
  readonly spawnfile: string
  /** An array of `bare-pipe` instances corresponding to the configured stdio slots. Slots configured as `'inherit'`, `'ignore'`, or backed by an inherited fd are `null`. */
  readonly stdio: (Pipe | null)[]
  /** Convenience accessor for `subprocess.stdio[0]`. */
  readonly stdin: Pipe | null
  /** Convenience accessor for `subprocess.stdio[1]`. */
  readonly stdout: Pipe | null
  /** Convenience accessor for `subprocess.stdio[2]`. */
  readonly stderr: Pipe | null
  /** The `SubprocessChannel` instance backing the IPC channel, or `undefined` when no channel exists. For `serialization: 'binary'`, this is always `undefined`. */
  readonly channel?: SubprocessChannel
  /** `true` while an IPC channel exists between parent and child. */
  readonly connected: boolean

  /** Reference the subprocess and its stdio pipes against the event loop. */
  ref(): void
  /** Unreference the subprocess and its stdio pipes against the event loop. */
  unref(): void

  /**
   * @param signum - Signal to send, as a signal number or name (for example `'SIGTERM'`); defaults to `SIGTERM`.
   * @throws {UNKNOWN_SIGNAL} thrown if `signum` is a string that isn't a recognized signal name.
   */
  kill(signum?: number): void

  /**
   * @param message - The value to send to the child over the IPC channel.
   * @param handle - A `bare-pipe` `Pipe` or `bare-tcp` `Socket` to transfer to the child along with `message`.
   * @param cb - Called with `(err)` once `message` has been written, or with an error if there is no connected IPC channel.
   * @returns `false` if the subprocess has no IPC channel or it has disconnected (`cb`, if given, is then invoked asynchronously with an error); otherwise the underlying pipe write result.
   */
  send(message: unknown, handle?: unknown, cb?: (err: Error | null) => void): boolean
  send(message: unknown, cb: (err: Error | null) => void): boolean

  disconnect(): void
}

export class Subprocess {}

export type SerializationMode = 'json' | 'advanced' | 'binary'

export interface SpawnOptions {
  cwd?: string
  stdio?: [stdin?: IO, stdout?: IO, stderr?: IO, ...fds: IO[]] | IO | null
  shell?: boolean | string
  detached?: boolean
  uid?: number
  gid?: number
  env?: Record<string, string>
  windowsHide?: boolean
  windowsVerbatimArguments?: boolean
  serialization?: SerializationMode
}

/**
 * Spawn `file` as a new subprocess with the given `args`. Returns a `Subprocess` instance. `args` may be `null` or omitted to spawn with no arguments. If `args` is omitted, the second argument is treated as `options`.
 * @param file - The executable to spawn; a string path or a `file://` URL.
 * @param args - Arguments to pass to `file`; may be `null` or omitted to spawn with none. If omitted, the second argument is treated as `opts`.
 * @param opts - Options controlling the environment, stdio, and behavior of the new subprocess; see `SpawnOptions`.
 * @throws {UNKNOWN_SERIALIZATION_MODE} thrown if `opts.serialization` is not `'json'`, `'advanced'`, or `'binary'`.
 * @throws {IPC_CHANNEL_ALREADY_DEFINED} thrown if `opts.stdio` requests more than one `'ipc'` slot.
 */
export function spawn(file: string, args?: string[] | null, opts?: SpawnOptions): Subprocess

export function spawn(file: string, opts?: SpawnOptions): Subprocess

export interface SpawnSyncOptions extends SpawnOptions {
  input?: string | Buffer
  maxBuffer?: number
}

export interface SpawnSyncResult {
  output: (Buffer | null)[] | null
  pid: number
  signal: number
  status: number
  stdout: Buffer | null
  stderr: Buffer | null
  error?: Error
}

export function spawnSync(
  file: string,
  args?: string[] | null,
  opts?: SpawnSyncOptions
): SpawnSyncResult

export function spawnSync(file: string, opts?: SpawnSyncOptions): SpawnSyncResult
