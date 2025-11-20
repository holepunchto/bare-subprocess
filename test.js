const test = require('brittle')
const fs = require('bare-fs')
const os = require('bare-os')
const path = require('bare-path')
const { spawn, spawnSync } = require('.')

test('basic', (t) => {
  t.plan(3)

  const subprocess = spawn(os.execPath(), ['test/fixtures/hello.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .on('close', () => t.pass('closed'))

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

test('overlapped', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/pipe.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'overlapped']
  })

  const pipe = subprocess.stdio[3]

  pipe.on('data', (data) => t.alike(data, Buffer.from('hello'))).end('hello')
})

test('ignore', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/fs.js'], {
    stdio: 'ignore'
  })

  subprocess.on('exit', (code, signal) => {
    t.is(code, 0)
    t.is(signal, 0)
  })
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

test('echo', (t) => {
  t.plan(3)

  const subprocess = spawn(os.execPath(), ['test/fixtures/echo.js'])

  const received = []

  subprocess.stdout
    .on('close', () => {
      t.pass('stdout closed')
      t.alike(Buffer.concat(received), Buffer.alloc(4 * 1024 * 1024, 'hello'))
    })
    .on('data', (data) => {
      received.push(data)
    })

  subprocess.stdin
    .on('close', () => {
      t.pass('stdin closed')
    })
    .end(Buffer.alloc(4 * 1024 * 1024, 'hello'))
})

test('abort', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/abort.js'])

  subprocess.on('exit', () => t.pass('exited'))

  subprocess.stdout.on('data', (data) =>
    t.alike(data, Buffer.from('before abort' + os.EOL))
  )

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
})

test('long path', { skip: Bare.platform === 'win32' }, (t) => {
  t.plan(2)

  const dir = `test/fixtures/${'a'.repeat(128)}/${'b'.repeat(128)}/${'c'.repeat(128)}`

  const file = `${dir}/${'d'.repeat(128)}`

  fs.mkdirSync(dir, { recursive: true })

  t.teardown(() =>
    fs.rmSync(`test/fixtures/${'a'.repeat(128)}`, { recursive: true })
  )

  fs.copyFileSync(os.execPath(), file)

  const subprocess = spawn(path.toNamespacedPath(file), ['-p', '"hello"'])

  subprocess.on('exit', () => t.pass('exited'))

  subprocess.stdout.on('data', (data) =>
    t.alike(data, Buffer.from('hello' + os.EOL))
  )

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
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
