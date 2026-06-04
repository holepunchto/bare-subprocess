const test = require('brittle')
const fs = require('bare-fs')
const os = require('bare-os')
const path = require('bare-path')
const tcp = require('bare-tcp')
const { spawn, spawnSync } = require('.')

test('basic', (t) => {
  t.plan(6)

  const subprocess = spawn(os.execPath(), ['test/fixtures/hello.js'])

  subprocess
    .on('exit', () => t.pass('exited'))
    .on('close', () => {
      t.is(subprocess.exitCode, 0)
      t.is(subprocess.killed, false)
      t.is(subprocess.signalCode, null)

      t.pass('closed')
    })

  subprocess.stdout.on('data', (data) => t.alike(data, Buffer.from('hello' + os.EOL)))

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
})

test('kill', (t) => {
  t.plan(4)

  const subprocess = spawn(os.execPath(), ['test/fixtures/spin.js'])

  subprocess
    .on('exit', () => {
      t.is(subprocess.exitCode, null)
      t.is(subprocess.killed, true)
      t.is(subprocess.signalCode, 'SIGTERM')

      t.pass('exited')
    })
    .kill()
})

test('sync', (t) => {
  t.plan(3)

  const subprocess = spawnSync(os.execPath(), ['test/fixtures/hello.js'])

  t.is(subprocess.signal, null)
  t.is(subprocess.status, 0)
  t.alike(subprocess.stdout, Buffer.from('hello' + os.EOL))
})

test('sync, not found', (t) => {
  t.plan(4)

  const subprocess = spawnSync('./this-does-not-exist')

  t.absent(subprocess.exitCode)
  t.absent(subprocess.killed)
  t.absent(subprocess.signalCode)
  t.is(subprocess.error.code, 'ENOENT')
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

  const subprocess = spawn(os.execPath(), ['test/fixtures/fs.js'], { stdio: 'ignore' })

  subprocess.on('exit', (code, signal) => {
    t.is(code, 0)
    t.is(signal, null)
  })
})

test('env', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/env.js'], { env: { KEY: 'VALUE' } })

  subprocess.stdout.on('data', (data) => t.alike(data, Buffer.from('VALUE' + os.EOL)))
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

  subprocess.stdout.on('data', (data) => t.alike(data, Buffer.from('before abort' + os.EOL)))

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
})

test('long path', { skip: Bare.platform === 'win32' }, (t) => {
  t.plan(2)

  const dir = `test/fixtures/${'a'.repeat(128)}/${'b'.repeat(128)}/${'c'.repeat(128)}`

  const file = `${dir}/${'d'.repeat(128)}`

  fs.mkdirSync(dir, { recursive: true })

  t.teardown(() => fs.rmSync(`test/fixtures/${'a'.repeat(128)}`, { recursive: true }))

  fs.copyFileSync(os.execPath(), file)

  const subprocess = spawn(path.toNamespacedPath(file), ['-p', '"hello"'])

  subprocess.on('exit', () => t.pass('exited'))

  subprocess.stdout.on('data', (data) => t.alike(data, Buffer.from('hello' + os.EOL)))

  subprocess.stderr.on('data', (err) => t.fail(err.toString()))
})

test('ipc, receive', (t) => {
  t.plan(1)

  const subprocess = spawn(os.execPath(), ['test/fixtures/ipc.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  })

  subprocess.on('message', (message) => {
    t.alike(message, { hello: 'world' })
    subprocess.kill()
  })
})

test('ipc, send + receive', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/ipc.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  })

  let received = 0

  subprocess.on('message', (message) => {
    received++

    if (received === 1) {
      t.alike(message, { hello: 'world' })
      subprocess.send({ ping: 42 })
    } else {
      t.alike(message, { echoed: { ping: 42 } })
      subprocess.kill()
    }
  })
})

test('ipc, advanced serialization', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/ipc.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    serialization: 'advanced'
  })

  const date = new Date('2026-01-01T00:00:00Z')

  let received = 0

  subprocess.on('message', (message) => {
    received++

    if (received === 1) {
      t.alike(message, { hello: 'world' })
      subprocess.send({ ts: date })
    } else {
      t.alike(message, { echoed: { ts: date } })
      subprocess.kill()
    }
  })
})

test('ipc, binary serialization', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/ipc-binary.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
    serialization: 'binary'
  })

  t.is(subprocess.channel, undefined)

  const pipe = subprocess.stdio[3]

  pipe.on('data', (chunk) => {
    t.alike(chunk, Buffer.from('echo:hello'))
    subprocess.kill()
  })

  pipe.write(Buffer.from('hello'))
})

test('ipc, malformed message', (t) => {
  t.plan(2)

  const subprocess = spawn(os.execPath(), ['test/fixtures/ipc-garbage.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  })

  subprocess.on('error', (err) => {
    t.is(err.code, 'INVALID_MESSAGE')
    t.ok(err.cause instanceof Error)
    subprocess.kill()
  })
})

test('ipc, send handle', async (t) => {
  t.plan(1)

  let subprocess, peer

  const server = tcp.createServer()

  server.on('connection', (sock) => {
    let received = Buffer.alloc(0)

    sock.on('data', (data) => {
      received = Buffer.concat([received, data])

      if (received.length >= 16) {
        t.alike(received, Buffer.from('hello from child'))

        sock.destroy()
        peer.destroy()
        server.close()
        subprocess.kill()
      }
    })
  })

  server.listen()
  await new Promise((resolve) => server.on('listening', resolve))

  const { port } = server.address()

  subprocess = spawn(os.execPath(), ['test/fixtures/ipc-handle.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  })

  peer = tcp.createConnection(port)

  peer.on('connect', () => {
    subprocess.send({ cmd: 'send' }, peer)
  })
})

test('ipc, send multiple handles interleaved with plain messages', async (t) => {
  t.plan(3)

  let subprocess, peerA, peerB

  const server = tcp.createServer()

  const received = { A: Buffer.alloc(0), B: Buffer.alloc(0) }
  let closedSockets = 0
  let plainReceived = false

  server.on('connection', (sock) => {
    let buffer = Buffer.alloc(0)

    sock.on('data', (data) => {
      buffer = Buffer.concat([buffer, data])

      if (buffer.length < 5) return

      const label = buffer.toString('utf8', 4, 5)
      received[label] = buffer
      sock.destroy()
      closedSockets++
      if (closedSockets === 2 && plainReceived) finish()
    })
  })

  server.listen()
  await new Promise((resolve) => server.on('listening', resolve))
  const { port } = server.address()

  subprocess = spawn(os.execPath(), ['test/fixtures/ipc-handles.js'], {
    stdio: ['inherit', 'inherit', 'inherit', 'ipc']
  })

  subprocess.on('message', (message, handle) => {
    if (message.plain && message.plain.note === 'no-handle') {
      plainReceived = true
      if (closedSockets === 2) finish()
    }
  })

  let connected = 0
  peerA = tcp.createConnection(port)
  peerB = tcp.createConnection(port)

  const onConnect = () => {
    if (++connected < 2) return

    subprocess.send({ id: 'A' }, peerA)
    subprocess.send({ note: 'no-handle' })
    subprocess.send({ id: 'B' }, peerB)
  }

  peerA.on('connect', onConnect)
  peerB.on('connect', onConnect)

  function finish() {
    t.alike(received.A, Buffer.from('got:A'), 'first handle received message A')
    t.alike(received.B, Buffer.from('got:B'), 'second handle received message B')
    t.pass('plain message routed correctly')

    peerA.destroy()
    peerB.destroy()
    server.close()
    subprocess.kill()
  }
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
