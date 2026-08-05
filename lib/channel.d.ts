interface SubprocessChannel {
  /** `true` while an IPC channel exists between parent and child. */
  readonly connected: boolean

  /**
   * @param message - The value to send to the other side of the channel.
   * @param handle - A `bare-pipe` `Pipe` or `bare-tcp` `Socket` to transfer along with `message`.
   * @param cb - Called with `(err)` once `message` has been written, or with an error if the channel is disconnected.
   * @returns `false` if the channel is disconnected (`cb`, if given, is then invoked asynchronously with a `CHANNEL_DISCONNECTED` error); otherwise the underlying pipe write result.
   */
  send(message: unknown, handle?: unknown, cb?: (err: Error | null) => void): boolean
  send(message: unknown, cb: (err: Error | null) => void): boolean

  /** Close the IPC channel. A `'disconnect'` event is emitted once the channel is fully closed. */
  disconnect(): void

  /** Reference the subprocess and its stdio pipes against the event loop. */
  ref(): this
  /** Unreference the subprocess and its stdio pipes against the event loop. */
  unref(): this
}

export = SubprocessChannel
