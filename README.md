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

See the [full API reference](https://docs.pears.com/reference/bare/modules/bare-subprocess).

## License

Apache-2.0
