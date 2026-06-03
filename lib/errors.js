module.exports = class SubprocessError extends Error {
  constructor(msg, code, fn = SubprocessError, opts) {
    super(`${code}: ${msg}`, opts)
    this.code = code

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, fn)
    }
  }

  get name() {
    return 'SubprocessError'
  }

  static UNKNOWN_SIGNAL(msg) {
    return new SubprocessError(msg, 'UNKNOWN_SIGNAL', SubprocessError.UNKNOWN_SIGNAL)
  }

  static IPC_CHANNEL_ALREADY_DEFINED(msg) {
    return new SubprocessError(
      msg,
      'IPC_CHANNEL_ALREADY_DEFINED',
      SubprocessError.IPC_CHANNEL_ALREADY_DEFINED
    )
  }

  static NO_IPC_CHANNEL(msg) {
    return new SubprocessError(msg, 'NO_IPC_CHANNEL', SubprocessError.NO_IPC_CHANNEL)
  }

  static CHANNEL_DISCONNECTED(msg) {
    return new SubprocessError(msg, 'CHANNEL_DISCONNECTED', SubprocessError.CHANNEL_DISCONNECTED)
  }

  static INVALID_MESSAGE(msg, cause) {
    return new SubprocessError(msg, 'INVALID_MESSAGE', SubprocessError.INVALID_MESSAGE, {
      cause
    })
  }

  static MESSAGE_TOO_LARGE(msg) {
    return new SubprocessError(msg, 'MESSAGE_TOO_LARGE', SubprocessError.MESSAGE_TOO_LARGE)
  }

  static UNKNOWN_SERIALIZATION_MODE(msg) {
    return new SubprocessError(
      msg,
      'UNKNOWN_SERIALIZATION_MODE',
      SubprocessError.UNKNOWN_SERIALIZATION_MODE
    )
  }
}
