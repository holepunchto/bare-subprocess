/* global Bare */
const test = require('brittle')
const os = require('bare-os')
const fs = require('bare-fs')
const { spawn, spawnSync } = require('.')

test('basic', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/hello.js'])

  subprocess.on('exit', () => t.pass('exited'))

  subprocess.stdout.on('data', (data) =>
    t.alike(data, Buffer.from('hello' + os.EOL))
  )

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
})

test('kill', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/spin.js'])

  subprocess.on('exit', () => t.pass('exited')).kill()
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

test('pipe', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/pipe.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'pipe']
  })

  const pipe = subprocess.stdio[3]

  pipe.on('data', (data) => t.alike(data, Buffer.from('hello'))).end('hello')
})

test('ignore standard streams', (t) => {
  t.plan(3)

  try {
    fs.rmSync('test/fixtures/log.txt')
  } catch {}

  const subprocess = spawn(os.execPath(), ['test/fixtures/std-pipe.js'], {
    stdio: 'ignore'
  })

  subprocess.on('exit', (code, signal) => {
    t.is(code, 0)
    t.is(signal, 0)

    let log

    try {
      log = fs.readFileSync('test/fixtures/log.txt').toString()
    } catch {}

    t.is(log, 'foo')
  })
})

test('overlapped', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/pipe.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'overlapped']
  })

  const pipe = subprocess.stdio[3]

  pipe.on('data', (data) => t.alike(data, Buffer.from('hello'))).end('hello')
})

test('env', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/env.js'], {
    env: { KEY: 'VALUE' }
  })

  subprocess.stdout.on('data', (data) =>
    t.alike(data, Buffer.from('VALUE' + os.EOL))
  )
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
