# bare-subprocess

Native process spawning for JavaScript. Spawn child processes with full control over their stdio, environment, and working directory, and exchange messages with them over an IPC channel.

```
npm i bare-subprocess
```

## Usage

```js
const { spawn } = require('bare-subprocess')

const subprocess = spawn('echo', ['hello', 'world'], {
  stdio: 'inherit'
})

subprocess.on('exit', () => console.log('done'))
```

## API

#### `const subprocess = spawn(file[, args][, options])`

Spawn `file` as a new subprocess with the given `args`. Returns a `Subprocess` instance. `args` may be `null` or omitted to spawn with no arguments. If `args` is omitted, the second argument is treated as `options`.

Options include:

```js
options = {
  cwd: os.cwd(),
  env: process.env,
  stdio: [],
  shell: false,
  detached: false,
  uid: -1,
  gid: -1,
  windowsHide: false,
  windowsVerbatimArguments: false,
  serialization: 'json'
}
```

`stdio` may be an array of slot descriptors or a single string applied to all of `stdin`, `stdout`, and `stderr`. Each slot may be one of:

| Value          | Description                                                                          |
| -------------- | ------------------------------------------------------------------------------------ |
| `'pipe'`       | Open a pipe between parent and child.                                                |
| `'overlapped'` | Like `'pipe'` but opens the pipe in overlapped mode on Windows.                      |
| `'inherit'`    | Inherit the parent's corresponding file descriptor (or `'ignore'` for fds beyond 2). |
| `'ignore'`     | Do not open the file descriptor in the child.                                        |
| `'ipc'`        | Open an IPC channel between parent and child. At most one slot may use this.         |

`serialization` selects how IPC messages are framed:

| Mode         | Description                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| `'json'`     | Newline-delimited JSON. Only JSON-serializable values are supported. Default.                         |
| `'advanced'` | Length-prefixed structured clone, via `bare-structured-clone`. Supports `Date`, `Map`, `Buffer`, etc. |
| `'binary'`   | Raw pipe with no framing. `subprocess.channel` is `undefined`; use `subprocess.stdio[fd]` directly.   |

`shell` may be a string identifying the shell to use, or `true` to use the platform default (`/bin/sh`, `/system/bin/sh` on Android, or `cmd.exe` on Windows).

#### `const result = spawnSync(file[, args][, options])`

Synchronously spawn `file` and wait for it to exit. Returns an object:

```js
result = {
  pid,
  status,
  signal,
  output,
  stdout,
  stderr,
  error
}
```

Accepts all `spawn` options plus:

```js
options = {
  input: null,
  maxBuffer: 1024 * 1024
}
```

`input` is written to the child's `stdin` before it starts. `maxBuffer` is the size of the buffer allocated to capture each `'pipe'` stdio slot.

### `class Subprocess`

The handle returned by `spawn`. Extends `EventEmitter`.

#### `subprocess.pid`

The process ID of the child.

#### `subprocess.spawnfile`

The file that was spawned.

#### `subprocess.spawnargs`

The arguments the child was spawned with.

#### `subprocess.stdio`

An array of `bare-pipe` instances corresponding to the configured stdio slots. Slots configured as `'inherit'`, `'ignore'`, or backed by an inherited fd are `null`.

#### `subprocess.stdin`

Convenience accessor for `subprocess.stdio[0]`.

#### `subprocess.stdout`

Convenience accessor for `subprocess.stdio[1]`.

#### `subprocess.stderr`

Convenience accessor for `subprocess.stdio[2]`.

#### `subprocess.exitCode`

The exit code of the child, or `null` if the child has not exited or was terminated by a signal.

#### `subprocess.signalCode`

The name of the signal the child was terminated with, or `null`.

#### `subprocess.killed`

`true` if `subprocess.kill()` has been called, otherwise `false`.

#### `subprocess.connected`

`true` while an IPC channel exists between parent and child.

#### `subprocess.channel`

The `SubprocessChannel` instance backing the IPC channel, or `undefined` when no channel exists. For `serialization: 'binary'`, this is always `undefined`.

#### `subprocess.ref()`

#### `subprocess.unref()`

Reference or unreference the subprocess and its stdio pipes against the event loop.

#### `subprocess.kill([signum])`

Send a signal to the child. `signum` may be a signal number or a name (e.g. `'SIGTERM'`). Defaults to `SIGTERM`.

#### `subprocess.send(message[, handle][, callback])`

Send `message` to the child over the IPC channel. `handle` may be a `bare-pipe` `Pipe` or a `bare-tcp` `Socket` to transfer ownership of along with the message. `callback` is invoked with `(err)` after the message has been written.

Returns `true` if the message was queued for transmission, or `false` if no IPC channel exists or the channel has been disconnected. Throws synchronously if the message cannot be serialized or exceeds the maximum frame size.

#### `subprocess.disconnect()`

Close the IPC channel. A `'disconnect'` event is emitted once the channel is fully closed.

#### `event: 'exit'`

Emitted with `(exitCode, signalCode)` when the child exits.

#### `event: 'close'`

Emitted with `(exitCode, signalCode)` when the child has exited and all stdio pipes have closed.

#### `event: 'message'`

Emitted with `(message, handle)` when a message is received over the IPC channel. `handle` is the transferred `Pipe` or `Socket`, or `null` if none was sent.

#### `event: 'disconnect'`

Emitted when the IPC channel has been fully closed.

#### `event: 'error'`

Emitted when an error occurs on the IPC channel, such as a malformed message or a pipe-level failure. The error has a `code` property; for parse errors the code is `'INVALID_MESSAGE'` and the original error is available on `err.cause`.

### `class SubprocessParentChannel`

Available as `require('bare-subprocess/parent')`. Constructed by the child process to access the parent end of the IPC channel. The serialization mode is selected automatically from the `BARE_CHANNEL_SERIALIZATION_MODE` environment variable, which is set by `spawn` in the parent.

```js
const ParentChannel = require('bare-subprocess/parent')

const parent = new ParentChannel()

parent.on('message', (message, handle) => {
  parent.send({ echoed: message })
})
```

#### `parent.connected`

`true` while the channel is open.

#### `parent.send(message[, handle][, callback])`

Same semantics as the corresponding `Subprocess` method.

#### `parent.disconnect()`

Same semantics as the corresponding `Subprocess` method.

#### `parent.ref()`

Same semantics as the corresponding `Subprocess` method.

#### `parent.unref()`

Same semantics as the corresponding `Subprocess` method.

#### `event: 'message'`

Same semantics as the corresponding `Subprocess` event.

#### `event: 'disconnect'`

Same semantics as the corresponding `Subprocess` event.

#### `event: 'error'`

Same semantics as the corresponding `Subprocess` event.

### `constants`

Re-exports the signal constants from `bare-os` (i.e. `os.constants.signals`). Also available as `require('bare-subprocess/constants')`.

## License

Apache-2.0
