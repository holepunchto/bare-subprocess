const EventEmitter = require('events')
const Pipe = require('bare-pipe')
const binding = require('./binding')

const Subprocess = exports.Subprocess = class Subprocess extends EventEmitter {
  constructor () {
    super()

    this._handle = binding.init(this, this._onexit)

    this.stdio = []
  }

  _onexit (code, signal) {
    this.emit('exit', code, signal)
  }

  get stdin () {
    return this.stdio[0]
  }

  get stdout () {
    return this.stdio[1]
  }

  get stderr () {
    return this.stdio[2]
  }
}

exports.spawn = function spawn (command, args, opts) {
  if (Array.isArray(args)) {
    args = [...args]
  } else if (args === null) {
    args = ''
  } else {
    opts = args
    args = ''
  }

  args = [command, ...args]

  if (!opts) opts = {}

  let {
    cwd = process.cwd(),
    env = process.env,
    stdio = 'pipe',
    detached = false,
    uid = -1,
    gid = -1
  } = opts

  const pairs = []

  for (const key in env) pairs.push(`${key}=${env[key]}`)

  if (typeof stdio === 'string') stdio = [stdio, stdio, stdio]

  const subprocess = new Subprocess()

  for (let i = 0, n = stdio.length; i < n; i++) {
    subprocess.stdio[i] = null

    let fd = stdio[i]

    if (fd === 'inherit') fd = i < 3 ? i : 'ignore'

    if (fd === 'ignore') {
      stdio[i] = { flags: binding.UV_IGNORE }
    } else if (fd === 'pipe') {
      const pipe = new Pipe()

      stdio[i] = { flags: binding.UV_CREATE_PIPE | binding.UV_READABLE_PIPE | binding.UV_WRITABLE_PIPE, pipe: pipe._handle }

      subprocess.stdio[i] = pipe
    } else {
      stdio[i] = { flags: binding.UV_INHERIT_FD, fd }
    }
  }

  binding.spawn(subprocess._handle,
    command,
    args,
    cwd,
    pairs,
    stdio,
    detached,
    uid,
    gid
  )

  return subprocess
}
