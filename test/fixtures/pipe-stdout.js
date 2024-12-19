const Pipe = require('bare-pipe')

const pipe = new Pipe(1)
pipe.write('hello world\n')

setImmediate(() => pipe.end())
