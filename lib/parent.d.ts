import EventEmitter, { EventMap } from 'bare-events'

interface SubprocessParentChannelEvents extends EventMap {
  message: [message: unknown, handle: unknown]
  disconnect: []
  error: [err: Error]
}

interface SubprocessParentChannel<
  M extends SubprocessParentChannelEvents = SubprocessParentChannelEvents
> extends EventEmitter<M> {
  readonly connected: boolean

  send(message: unknown, handle?: unknown, cb?: (err: Error | null) => void): boolean
  send(message: unknown, cb: (err: Error | null) => void): boolean

  disconnect(): void

  ref(): this
  unref(): this
}

declare class SubprocessParentChannel<
  M extends SubprocessParentChannelEvents = SubprocessParentChannelEvents
> {
  constructor()
}

export = SubprocessParentChannel
