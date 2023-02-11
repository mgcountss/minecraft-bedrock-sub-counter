const send = require('./send.js').send
const jimp = require('jimp')
const woolColors = require('./woolColors.json')

function findClosestWoolColor2(r, g, b) {
    let closestColor = woolColors[0];
    let closestDistance = Number.MAX_VALUE;
    for (const woolColor of woolColors) {
        let rgb = woolColor.rgb.split(",")
        const distance =
            (r - rgb[0]) ** 2 + (g - rgb[1]) ** 2 + (b - rgb[2]) ** 2;
        if (distance < closestDistance) {
            closestColor = woolColor;
            closestDistance = distance;
        }
    }
    return closestColor.name;
}

const startThing = (socket) => {
    setTimeout(() => {
        let corner1 = "-31 -60 82"
        let width = 35
        let height = 35
        jimp.read("./test.png", function (err, image) {
            image = image.flip(true, false)
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    let color = jimp.intToRGBA(image.getPixelColor(x, y))
                    let woolColor = findClosestWoolColor2(color.r, color.g, color.b)
                    let cords = corner1.split(" ")
                    cords[0] = parseInt(cords[0]) + x
                    cords[2] = parseInt(cords[2]) - y
                    cords = cords.join(" ")
                    send("/setblock " + cords + " " + woolColor, socket)
                }
            }
        });
    }, 100)
}

module.exports = startThing;