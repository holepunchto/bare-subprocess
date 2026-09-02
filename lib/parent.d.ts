import EventEmitter, { EventMap } from 'bare-events'

interface SubprocessParentChannelEvents extends EventMap {
  /** Emitted with each message received over the IPC channel, and any transferred handle. */
  message: [message: unknown, handle: unknown]
  /** Emitted once the IPC channel has fully closed. */
  disconnect: []
  /** Emitted when the IPC channel errors. */
  error: [err: Error]
}

interface SubprocessParentChannel<
  M extends SubprocessParentChannelEvents = SubprocessParentChannelEvents
> extends EventEmitter<M> {
  /** `true` while an IPC channel exists between parent and child. */
  readonly connected: boolean

  /**
   * @param message - The value to send to the parent process over the IPC channel.
   * @param handle - A `bare-pipe` `Pipe` or `bare-tcp` `Socket` to transfer to the parent along
   * with `message`.
   * @param cb - Called with `(err)` once `message` has been written, or with an error if the
   * channel is disconnected.
   * @returns `false` if the channel is disconnected (`cb`, if given, is then invoked asynchronously
   * with a `CHANNEL_DISCONNECTED` error); otherwise the underlying pipe write result.
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

declare class SubprocessParentChannel<
  M extends SubprocessParentChannelEvents = SubprocessParentChannelEvents
> {
  /**
   * @throws {NO_IPC_CHANNEL} thrown if the `BARE_CHANNEL_FD` environment variable is not set.
   * @throws {UNKNOWN_SERIALIZATION_MODE} thrown if `BARE_CHANNEL_SERIALIZATION_MODE` is set to
   * something other than `'json'` or `'advanced'`.
   */
  constructor()
}

export = SubprocessParentChannel
