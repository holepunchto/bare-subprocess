import EventEmitter, { EventMap } from 'bare-events'
import Buffer from 'bare-buffer'
import Env from 'bare-env'
import Pipe from 'bare-pipe'
import constants from './lib/constants'
import errors from './lib/errors'

interface SubprocessEvents extends EventMap {
  exit: [code: number, signalCode: string]
}

type SpawnMode = 'inherit' | 'pipe' | 'overlapped' | 'ignore'

declare class Subprocess<
  M extends SubprocessEvents = SubprocessEvents
> extends EventEmitter<M> {
  readonly exitCode: number | null
  readonly killed: boolean
  readonly pid: number
  readonly signalCode: string | null
  readonly spawnargs: string[]
  readonly spawnfile: string
  readonly stdio: (Pipe | null)[]

  readonly stdin: Pipe | null
  readonly stdout: Pipe | null
  readonly stderr: Pipe | null

  ref(): void
  unref(): void

  kill(signum?: number): void
}

interface SpawnOptions {
  cwd?: string
  stdio?:
    | [stdin?: SpawnMode, stdout?: SpawnMode, stderr?: SpawnMode]
    | (SpawnMode | null)[]
    | SpawnMode
  detached?: boolean
  uid?: number
  gid?: number
  env?: Env
}

declare function spawn(
  file: string,
  args?: string[] | null,
  opts?: SpawnOptions
): Subprocess

declare function spawn(file: string, opts?: SpawnOptions): Subprocess

declare function spawnSync(
  file: string,
  args?: string[] | null,
  opts?: SpawnOptions
): {
  output: (Buffer | null)[]
  pid: number
  signal: number
  status: number
  stderr: Buffer | null
  stdout: Buffer | null
}

declare function spawnSync(
  file: string,
  opts?: SpawnOptions
): {
  output: (Buffer | null)[]
  pid: number
  signal: number
  status: number
  stderr: Buffer | null
  stdout: Buffer | null
}

export { Subprocess, constants, errors, spawn, spawnSync }

export type { SubprocessEvents, SpawnOptions, SpawnMode }
