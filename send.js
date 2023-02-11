const uuid = require('uuid')
let lastMsgTime = 0
let queue = []
const send = (cmd, socket, type) => {
    if (!type) {
        if (Date.now() - lastMsgTime < 50) {
            queue.push(cmd)
            return
        }
    }
    const msg = {
        "header": {
            "version": 1,
            "requestId": uuid.v4(),
            "messagePurpose": "commandRequest",
            "messageType": "commandRequest"
        },
        "body": {
            "version": 1,
            "commandLine": cmd,
            "origin": {
                "type": "player"
            }
        }
    }
    socket.send(JSON.stringify(msg))
    lastMsgTime = Date.now()
    if (queue.length > 0) {
        setTimeout(() => {
            send(queue.shift(), socket)
        }, 100)
    }
}
module.exports = { send, clearQueue: () => { queue = [] } };