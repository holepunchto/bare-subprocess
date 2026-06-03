const EventEmitter = require('bare-events')
const Pipe = require('bare-pipe')
const env = require('bare-env')
const SubprocessChannel = require('./channel')
const JSONFramer = require('./framers/json')
const AdvancedFramer = require('./framers/advanced')
const errors = require('./errors')

module.exports = class SubprocessParentChannel extends EventEmitter {
  constructor() {
    super()

    const fd = Number(env.BARE_CHANNEL_FD)

    if (!Number.isFinite(fd)) {
      throw errors.NO_IPC_CHANNEL('BARE_CHANNEL_FD is not set')
    }

    const serialization = env.BARE_CHANNEL_SERIALIZATION_MODE || 'json'

    let framer

    if (serialization === 'json') {
      framer = new JSONFramer()
    } else if (serialization === 'advanced') {
      framer = new AdvancedFramer()
    } else {
      throw errors.UNKNOWN_SERIALIZATION_MODE(`Unknown serialization mode '${serialization}'`)
    }

    this._pipe = new Pipe(fd, { ipc: true })
    this._channel = new SubprocessChannel(this, this._pipe, framer)
  }

  get connected() {
    return this._channel.connected
  }

  send(message, handle = null, cb) {
    return this._channel.send(message, handle, cb)
  }

  disconnect() {
    this._channel.disconnect()
  }

  ref() {
    this._channel.ref()
    return this
  }

  unref() {
    this._channel.unref()
    return this
  }
}
