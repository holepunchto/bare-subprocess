const test = require('brittle')
const { spawn, spawnSync } = require('.')

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

test('symlink', (t) => {
  t.plan(1)

  const subprocess = spawn(process.execPath, ['test/fixtures/link.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
})

test('kill', (t) => {
  t.plan(1)

  const subprocess = spawn(process.execPath, ['test/fixtures/spin.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .kill()
})

test('sync', (t) => {
  t.plan(2)

  const subprocess = spawnSync(process.execPath, ['test/fixtures/hello.js'])

  t.is(subprocess.status, 0)
  t.alike(subprocess.stdout, Buffer.from('hello\n'))
})

test('sync, not found', (t) => {
  t.exception(() => spawnSync('./this-does-not-exist'))
})

test('unref', (t) => {
  t.plan(1)

  const subprocess = spawn(process.execPath, ['test/fixtures/spin.js'])

  subprocess.unref()

  process.prependOnceListener('beforeExit', () => {
    t.pass('process exited')
    subprocess.kill()
  })
})
