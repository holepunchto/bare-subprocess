const Pipe = require('bare-pipe')

const stdin = new Pipe(0)
const stdout = new Pipe(1)

stdin.end()
stdout.push(null)

stdin.pipe(stdout)
