const Pipe = require('bare-pipe')

new Pipe(0).end('stdin')
new Pipe(1).end('stdout')
new Pipe(2).end('stderr')
