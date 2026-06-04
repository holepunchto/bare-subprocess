const ParentChannel = require('bare-subprocess/parent')

const parent = new ParentChannel()

parent.on('message', (message, handle) => {
  if (handle === null) {
    parent.send({ plain: message })
  } else {
    handle.write('got:' + message.id)
    handle.end()
  }
})
