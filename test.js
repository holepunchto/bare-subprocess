/* global Bare */
const test = require('brittle')
const os = require('bare-os')
const { spawn, spawnSync } = require('.')

test('basic', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/hello.js'])

  subprocess
    .on('exit', () => t.pass('exited'))

  subprocess.stdout
    .on('data', (data) => t.alike(data, Buffer.from('hello' + os.EOL)))

  subprocess.stderr
    .on('data', (err) => t.fail(err.toString()))
})

test('kill', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/spin.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .kill()
})

test('sync', (t) => {
  t.plan(2)

  const subprocess = spawnSync(os.execPath(), ['test/fixtures/hello.js'])

  t.is(subprocess.status, 0)
  t.alike(subprocess.stdout, Buffer.from('hello' + os.EOL))
})

test('sync, not found', (t) => {
  t.exception(() => spawnSync('./this-does-not-exist'))
})

test('unref', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/spin.js'])

  subprocess.unref()

  Bare.prependOnceListener('beforeExit', () => {
    t.pass('process exited')
    subprocess.kill()
  })
})
