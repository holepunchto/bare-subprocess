const Pipe = require('bare-pipe')

const pipe = new Pipe(3)

pipe.on('data', (data) => pipe.end(data))
