const EventEmitter = require('events')
const os = require('os')
const Pipe = require('bare-pipe')
const binding = require('./binding')
const errors = require('./lib/errors')

const Subprocess = exports.Subprocess = class Subprocess extends EventEmitter {
  constructor () {
    super()

    this._handle = binding.init(this, this._onexit)

    this.spawnfile = null
    this.spawnargs = []
    this.pid = null
    this.stdio = []
    this.exitCode = null
    this.signalCode = null
    this.killed = false
  }

  _onexit (code, signal) {
    this.exitCode = code
    this.signalCode = signal
    this.emit('exit', code, signal)
  }

  get stdin () {
    return this.stdio[0] || null
  }

  get stdout () {
    return this.stdio[1] || null
  }

  get stderr () {
    return this.stdio[2] || null
  }

  ref () {
    for (const pipe of this.stdio) {
      if (pipe) pipe.ref()
    }

    binding.ref(this._handle)
  }

  unref () {
    for (const pipe of this.stdio) {
      if (pipe) pipe.unref()
    }

    binding.unref(this._handle)
  }

  kill (signum = signals.SIGTERM) {
    if (typeof signum === 'string') {
      if (signum in signals === false) {
        throw errors.UNKNOWN_SIGNAL('Unknown signal: ' + signum)
      }

      signum = signals[signum]
    }

    binding.kill(this._handle, signum)

    this.killed = true
  }
}

exports.spawn = function spawn (file, args, opts) {
  if (Array.isArray(args)) {
    args = [...args]
  } else if (args === null) {
    args = []
  } else {
    opts = args
    args = []
  }

  if (!opts) opts = {}

  let {
    cwd = process.cwd(),
    env = process.env,
    stdio = [],
    detached = false,
    uid = -1,
    gid = -1
  } = opts

  const pairs = []

  for (const key in env) pairs.push(`${key}=${env[key]}`)

  if (Array.isArray(stdio)) {
    stdio = [...stdio]
  } else if (typeof stdio === 'string') {
    stdio = [stdio, stdio, stdio]
  } else {
    stdio = []
  }

  const subprocess = new Subprocess()

  subprocess.spawnfile = file
  subprocess.spawnargs = args

  for (let i = 0, n = Math.max(3, stdio.length); i < n; i++) {
    subprocess.stdio[i] = null

    let fd = stdio[i] || 'pipe'

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

  subprocess.pid = binding.spawn(subprocess._handle,
    file,
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

exports.spawnSync = function spawn (file, args, opts) {
  if (Array.isArray(args)) {
    args = [...args]
  } else if (args === null) {
    args = []
  } else {
    opts = args
    args = []
  }

  if (!opts) opts = {}

  let {
    cwd = process.cwd(),
    env = process.env,
    input = null,
    stdio = [],
    detached = false,
    uid = -1,
    gid = -1,
    maxBuffer = 1024 * 1024
  } = opts

  const pairs = []

  for (const key in env) pairs.push(`${key}=${env[key]}`)

  if (Array.isArray(stdio)) {
    stdio = [...stdio]
  } else if (typeof stdio === 'string') {
    stdio = [stdio, stdio, stdio]
  } else {
    stdio = []
  }

  const subprocess = new Subprocess()

  if (input) {
    stdio[0] = { flags: binding.UV_CREATE_PIPE | binding.UV_READABLE_PIPE, buffer: input }

    process.stdio[0] = null
  }

  for (let i = input ? 1 : 0, n = Math.max(3, stdio.length); i < n; i++) {
    subprocess.stdio[i] = null

    let fd = stdio[i] || 'pipe'

    if (fd === 'inherit') fd = i < 3 ? i : 'ignore'

    if (fd === 'ignore') {
      stdio[i] = { flags: binding.UV_IGNORE }
    } else if (fd === 'pipe') {
      const buffer = Buffer.alloc(maxBuffer)

      stdio[i] = { flags: binding.UV_CREATE_PIPE | binding.UV_WRITABLE_PIPE, buffer, written: 0 }

      if (i > 0) subprocess.stdio[i] = buffer
    } else if (typeof fd === 'number') {
      stdio[i] = { flags: binding.UV_INHERIT_FD, fd }
    }
  }

  subprocess.pid = binding.spawnSync(subprocess._handle,
    file,
    args,
    cwd,
    pairs,
    stdio,
    detached,
    uid,
    gid
  )

  for (let i = 1, n = stdio.length; i < n; i++) {
    if (stdio[i].flags & binding.UV_WRITABLE_PIPE) {
      subprocess.stdio[i] = subprocess.stdio[i].subarray(0, stdio[i].written)
    }
  }

  return {
    status: subprocess.exitCode,
    signal: subprocess.signalCode,
    output: subprocess.stdio,
    pid: subprocess.pid,
    stdout: subprocess.stdout,
    stderr: subprocess.stderr
  }
}

const signals = exports.constants = os.constants.signals
