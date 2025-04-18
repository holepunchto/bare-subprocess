const Pipe = require('bare-pipe')
const fs = require('bare-fs')
const path = require('bare-path')

const stdout = new Pipe(1)
stdout.write('this is stdout\n')

const stderr = new Pipe(2)
stderr.write('this is stderr\n')

setImmediate(() => {
  fs.appendFileSync(path.join(__dirname, 'log.txt'), 'foo', 'utf-8')
})
