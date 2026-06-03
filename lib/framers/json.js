const errors = require('../errors')

const MAX_FRAME_SIZE = 0xffffffff

module.exports = class SubprocessJSONFramer {
  constructor() {
    this._buffer = []
    this._buffered = 0
  }

  encode(message) {
    return Buffer.from(JSON.stringify(message) + '\n')
  }

  push(chunk, onmessage) {
    this._buffer.push(chunk)
    this._buffered += chunk.byteLength

    if (chunk.indexOf(0x0a /* \n */) !== -1) {
      this._consume(onmessage)
    }

    if (this._buffered > MAX_FRAME_SIZE) {
      throw errors.MESSAGE_TOO_LARGE(
        `IPC message exceeds the maximum frame size of ${MAX_FRAME_SIZE} bytes`
      )
    }
  }

  _consume(onmessage) {
    while (true) {
      let bufferIdx = -1
      let byteIdx = -1
      let offset = 0

      for (let i = 0; i < this._buffer.length; i++) {
        const idx = this._buffer[i].indexOf(0x0a /* \n */)

        if (idx !== -1) {
          bufferIdx = i
          byteIdx = idx
          break
        }

        offset += this._buffer[i].byteLength
      }

      if (bufferIdx === -1) return

      const lineLength = offset + byteIdx

      if (lineLength > MAX_FRAME_SIZE) {
        throw errors.MESSAGE_TOO_LARGE(
          `IPC message exceeds the maximum frame size of ${MAX_FRAME_SIZE} bytes`
        )
      }

      let line

      if (bufferIdx === 0) {
        line = this._buffer[0].subarray(0, byteIdx).toString('utf8')
      } else {
        const parts = []
        for (let i = 0; i < bufferIdx; i++) parts.push(this._buffer[i])
        parts.push(this._buffer[bufferIdx].subarray(0, byteIdx))

        line = Buffer.concat(parts).toString('utf8')
      }

      this._buffered -= lineLength + 1

      const remainder = this._buffer[bufferIdx].subarray(byteIdx + 1)
      this._buffer.splice(0, bufferIdx + 1)
      if (remainder.byteLength > 0) this._buffer.unshift(remainder)

      let message
      try {
        message = JSON.parse(line)
      } catch (err) {
        throw errors.INVALID_MESSAGE('Invalid IPC message', err)
      }

      onmessage(message)
    }
  }
}
