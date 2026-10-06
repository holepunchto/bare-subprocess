const { spawn } = require('../..')

try {
  spawn('./this-does-not-exist')
} catch (err) {
  console.log(err.code)
}
