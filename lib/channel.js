const Pipe = require('bare-pipe')
const { Socket } = require('bare-tcp')
const errors = require('./errors')

module.exports = class SubprocessChannel {
  constructor(subprocess, pipe, framer) {
    this._subprocess = subprocess
    this._pipe = pipe
    this._framer = framer
    this._connected = true
    this._pendingHandles = []

    this._onmessage = this._onmessage.bind(this)

    pipe
      .on('data', this._ondata.bind(this))
      .on('handle', this._onhandle.bind(this))
      .on('error', this._onerror.bind(this))
      .on('end', this._ondisconnect.bind(this))
      .on('close', this._ondisconnect.bind(this))
  }

  get connected() {
    return this._connected
  }

  send(message, handle = null, cb) {
    if (typeof handle === 'function') {
      cb = handle
      handle = null
    }

    if (this._connected === false) {
      const err = errors.CHANNEL_DISCONNECTED('Channel is disconnected')
      if (cb) queueMicrotask(() => cb(err))
      return false
    }

    const data = this._framer.encode({ message, hasHandle: handle !== null })

    if (handle !== null) return this._pipe.write(data, handle, cb)
    return this._pipe.write(data, cb)
  }

  disconnect() {
    if (this._connected === false) return
    this._pipe.end()
  }

  ref() {
    this._pipe.ref()
    return this
  }

  unref() {
    this._pipe.unref()
    return this
  }

  _onhandle(type) {
    let target

    if (type === Pipe.constants.handle.NAMED_PIPE) {
      target = new Pipe()
    } else if (type === Pipe.constants.handle.TCP) {
      target = new Socket()
    } else return

    this._pipe.accept(target)
    this._pendingHandles.push(target)
  }

  _ondata(chunk) {
    try {
      this._framer.push(chunk, this._onmessage)
    } catch (err) {
      this._subprocess.emit('error', err)
    }
  }

  _onerror(err) {
    this._subprocess.emit('error', err)
  }

  _onmessage(envelope) {
    const { message, hasHandle } = envelope
    const handle = hasHandle ? this._pendingHandles.shift() || null : null
    this._subprocess.emit('message', message, handle)
  }

  _ondisconnect() {
    if (this._connected === false) return
    this._connected = false

    for (const target of this._pendingHandles) target.destroy()
    this._pendingHandles = []

    this._subprocess.emit('disconnect')
  }
}
