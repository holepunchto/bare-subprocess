const Pipe = require('bare-pipe')
const env = require('bare-env')

const pipe = new Pipe(Number(env.BARE_CHANNEL_FD), { ipc: true })

pipe.on('data', () => {})

pipe.write(Buffer.from('not json\n'))
