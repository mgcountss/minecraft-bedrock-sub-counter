const WebSocket = require('ws')
const uuid = require('uuid')
console.log('/connect localhost:3000')
const wss = new WebSocket.Server({ port: 3000 })
const getSubs = require('./getSubs.js')
const clearQueue = require('./send.js').clearQueue

wss.on('connection', socket => {
    console.log('Connected')
    socket.send(JSON.stringify({
        "header": {
            "version": 1,
            "requestId": uuid.v4(),
            "messageType": "commandRequest",
            "messagePurpose": "subscribe"
        },
        "body": {
            "eventName": "PlayerMessage"
        },
    }))
    socket.on('message', packet => {
        const msg = JSON.parse(packet)
        if (msg.header.eventName === 'PlayerMessage') {
            const match1 = msg.body.message.includes('subs ')
            const match2 = msg.body.message == 'reset'
            if (match2) {
                send('/say Resetting!')
                send(`fill 3 -60 42 -31 -60 46 air`)
                send('/fill -31 -60 82 3 -59 48 air')
                clearQueue()
            }
            if (match1 == true) {
                send('/say Fetching Subscribers!')
                let message = msg.body.message.replace('https://www.youtube.com/channel/', '')
                message = message.replace('subs ', '')
                getSubs.getSubs(socket, message)
            }
        }
    })
    function send(cmd) {
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
    }
})