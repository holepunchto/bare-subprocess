const Pipe = require('bare-pipe')
const env = require('bare-env')

const pipe = new Pipe(Number(env.BARE_CHANNEL_FD), { ipc: true })

pipe.on('data', (chunk) => {
  pipe.write(Buffer.concat([Buffer.from('echo:'), chunk]))
})
