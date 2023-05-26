const { spawn } = require('.')

const subprocess = spawn('echo', ['hello', 'world'], {
  stdio: 'pipe'
})

subprocess
  .on('exit', (code, signal) => console.log('exit', code, signal))

subprocess.stdout
  .on('data', (data) => console.log(data.toString().trim()))
