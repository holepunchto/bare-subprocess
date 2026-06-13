const pipe = Bare.IPC

pipe.on('data', (chunk) => {
  pipe.write(Buffer.concat([Buffer.from('echo:'), chunk]))
})
