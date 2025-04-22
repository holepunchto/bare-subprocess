const fs = require('bare-fs')
const assert = require('bare-assert')

fs.read(0, Buffer.alloc(1024), (err, read) => {
  assert(err === null)
})

fs.write(1, 'hello', (err) => {
  assert(err === null)
})

fs.write(2, 'hello', (err) => {
  assert(err === null)
})
