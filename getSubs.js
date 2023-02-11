const send = require('./send.js').send
const sharp = require('sharp')
const fs = require('fs');
const startThing = require('./getImg.js')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
let setCords = "1 -60 42"

const getSubs = (socket, cid) => {
    if (cid.includes("/channel/")) {
        cid = cid.split("/channel/")[1]
    }
    fetch('https://mixerno.space/api/youtube-channel-counter/user/' + cid + '')
        .then(res => res.json())
        .then(json => {
            let subs = json.counts[0].count.toString()
            let image = json.user[1].count
            fetch(image)
                .then(res => {
                    const dest = fs.createWriteStream('./image.png');
                    res.body.pipe(dest);
                    dest.on('finish', () => {
                        shrinkImg(socket)
                    });
                });
            for (let q = 0; q < subs.length; q++) {
                let numberCords = ""
                if (subs[q] == "0") {
                    numberCords = "-34 -64 46 -36 -64 42"
                } else if (subs[q] == "1") {
                    numberCords = "2 -64 46 0 -64 42"
                } else if (subs[q] == "2") {
                    numberCords = "-2 -64 46 -4 -64 42"
                } else if (subs[q] == "3") {
                    numberCords = "-6 -64 46 -8 -64 42"
                } else if (subs[q] == "4") {
                    numberCords = "-10 -64 46 -12 -64 42"
                } else if (subs[q] == "5") {
                    numberCords = "-14 -64 46 -16 -64 42"
                } else if (subs[q] == "6") {
                    numberCords = "-18 -64 46 -20 -64 42"
                } else if (subs[q] == "7") {
                    numberCords = "-22 -64 46 -24 -64 42"
                } else if (subs[q] == "8") {
                    numberCords = "-26 -64 46 -28 -64 42"
                } else if (subs[q] == "9") {
                    numberCords = "-30 -64 46 -32 -64 42"
                }
                if (q == 0) {
                    setCords = "1 -60 42"
                } else if (q == 1) {
                    setCords = "-3 -60 42"
                } else if (q == 2) {
                    setCords = "-7 -60 42"
                } else if (q == 3) {
                    setCords = "-11 -60 42"
                } else if (q == 4) {
                    setCords = "-15 -60 42"
                } else if (q == 5) {
                    setCords = "-19 -60 42"
                } else if (q == 6) {
                    setCords = "-23 -60 42"
                } else if (q == 7) {
                    setCords = "-27 -60 42"
                } else if (q == 8) {
                    setCords = "-31 -60 42"
                } else if (q == 9) {
                    setCords = "-35 -60 42"
                }
                send(`/clone ${numberCords} ${setCords}`, socket, 'type')
            }
        })
}

function shrinkImg(socket) {
    let outputHeight = 35;
    let outputWidth = 35;
    let img = fs.readFileSync('image.png');
    img = sharp(img)
        .resize(35, 35)
        .toFile('test.png', (err, info) => {
            if (err) {
                console.log(err)
            } else {
                startThing(socket)
            }
        });
}

module.exports = { getSubs };