const ParentChannel = require('bare-subprocess/parent')

const parent = new ParentChannel()

parent.on('message', (message, handle) => {
  if (message.cmd === 'send' && handle !== null) {
    handle.write('hello from child')
    handle.end()
  }
})
