const EventEmitter = require('events')
const Pipe = require('bare-pipe')
const Signal = require('bare-signals')
const binding = require('./binding')

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
    return this.stdio[0]
  }

  get stdout () {
    return this.stdio[1]
  }

  get stderr () {
    return this.stdio[2]
  }

  kill (signum = signals.SIGTERM) {
    if (typeof signum === 'string' && signum in signals) {
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
    stdio = 'pipe',
    detached = false,
    uid = -1,
    gid = -1
  } = opts

  const pairs = []

  for (const key in env) pairs.push(`${key}=${env[key]}`)

  if (typeof stdio === 'string') stdio = [stdio, stdio, stdio]

  const subprocess = new Subprocess()

  subprocess.spawnfile = file
  subprocess.spawnargs = args

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

const signals = exports.constants = Signal.constants
