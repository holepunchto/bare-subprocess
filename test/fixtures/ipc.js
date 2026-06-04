const ParentChannel = require('bare-subprocess/parent')

const parent = new ParentChannel()

parent.send({ hello: 'world' })

parent.on('message', (message) => {
  parent.send({ echoed: message })
})
