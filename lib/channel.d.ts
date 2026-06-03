interface SubprocessChannel {
  readonly connected: boolean

  send(message: unknown, handle?: unknown, cb?: (err: Error | null) => void): boolean
  send(message: unknown, cb: (err: Error | null) => void): boolean

  disconnect(): void

  ref(): this
  unref(): this
}

export = SubprocessChannel
