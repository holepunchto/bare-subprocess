const structuredClone = require('bare-structured-clone')
const errors = require('../errors')

const MAX_FRAME_SIZE = 0xffffffff

module.exports = class SubprocessAdvancedFramer {
  constructor() {
    this._buffer = []
    this._buffered = 0
    this._bodyLength = -1
  }

  encode(message) {
    const serialized = structuredClone.serialize(message)

    const state = { start: 0, end: 4, buffer: null }

    structuredClone.preencode(state, serialized)

    const bodyLength = state.end - 4

    if (bodyLength > MAX_FRAME_SIZE) {
      throw errors.MESSAGE_TOO_LARGE(
        `IPC message exceeds the maximum frame size of ${MAX_FRAME_SIZE} bytes`
      )
    }

    const frame = Buffer.alloc(state.end)
    state.buffer = frame

    frame.writeUInt32LE(bodyLength, 0)
    state.start += 4

    structuredClone.encode(state, serialized)

    return frame
  }

  push(chunk, onmessage) {
    this._buffer.push(chunk)
    this._buffered += chunk.byteLength

    this._consume(onmessage)
  }

  _consume(onmessage) {
    while (true) {
      if (this._bodyLength === -1) {
        if (this._buffered < 4) return

        const header = this._read(4)
        this._bodyLength = header.readUInt32LE(0)
      }

      if (this._buffered < this._bodyLength) return

      const body = this._read(this._bodyLength)
      this._bodyLength = -1

      let message
      try {
        const state = { start: 0, end: body.byteLength, buffer: body }

        message = structuredClone.deserialize(structuredClone.decode(state))
      } catch (err) {
        throw errors.INVALID_MESSAGE('Invalid IPC message', err)
      }

      onmessage(message)
    }
  }

  _read(n) {
    this._buffered -= n

    if (this._buffer[0].byteLength === n) {
      return this._buffer.shift()
    }

    if (this._buffer[0].byteLength > n) {
      const head = this._buffer[0]
      this._buffer[0] = head.subarray(n)

      return head.subarray(0, n)
    }

    const parts = []
    let remaining = n

    while (remaining > 0) {
      const head = this._buffer[0]

      if (head.byteLength <= remaining) {
        parts.push(head)
        remaining -= head.byteLength
        this._buffer.shift()
      } else {
        parts.push(head.subarray(0, remaining))
        this._buffer[0] = head.subarray(remaining)
        remaining = 0
      }
    }

    return Buffer.concat(parts)
  }
}
