const test = require('brittle')
const { spawn } = require('.')

test('basic', (t) => {
  t.plan(2)

  const subprocess = spawn(process.execPath, ['test/fixtures/hello.js'])

  subprocess
    .on('exit', () => t.pass('exited'))

  subprocess.stdout
    .on('data', (data) => t.alike(data, Buffer.from('hello\n')))

  subprocess.stderr
    .on('data', (err) => t.fail(err.toString()))
})

test('kill', (t) => {
  t.plan(1)

  const subprocess = spawn(process.execPath, ['test/fixtures/spin.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .kill()
})

test('unref', (t) => {
  t.plan(1)

  const subprocess = spawn(process.execPath, ['test/fixtures/spin.js'])

  subprocess.unref()

  process.prependListener('beforeExit', onbeforeexit)

  function onbeforeexit () {
    process.removeListener('beforeExit', onbeforeexit)
    t.pass('process exited')
    subprocess.kill()
  }
})
