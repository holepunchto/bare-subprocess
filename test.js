const test = require('brittle')
const { spawn, spawnSync } = require('.')

test('basic', (t) => {
  t.plan(2)

  const subprocess = spawn('bare', ['test/fixtures/hello.js'])

  subprocess
    .on('exit', () => t.pass('exited'))

  subprocess.stdout
    .on('data', (data) => t.alike(data, Buffer.from('hello\n')))

  subprocess.stderr
    .on('data', (err) => t.fail(err.toString()))
})

test('kill', (t) => {
  t.plan(1)

  const subprocess = spawn('bare', ['test/fixtures/spin.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .kill()
})

test('unref', (t) => {
  t.plan(1)

  const subprocess = spawn('bare', ['test/fixtures/spin.js'])

  subprocess.unref()

  process.on('exit', () => {
    t.pass('process exited')
    subprocess.kill()
  })
})

test('sync', (t) => {
  t.plan(2)

  const subprocess = spawnSync('bare', ['test/fixtures/hello.js'])

  t.is(subprocess.status, 0)

  // TODO: Make I/O sync
  subprocess.stdout
    .on('data', (data) => t.alike(data, Buffer.from('hello\n')))
})
