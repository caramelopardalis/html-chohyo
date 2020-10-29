import { htmlChohyo } from '../../src/js/html-chohyo.js'

const chohyo = new htmlChohyo();

chohyo.preview()

/*
setTimeout(async () => {
    const ipag = await chohyo.fetchFont('fonts/ipag.ttf')
    chohyo.pdf({
        fonts: [
            {
                fileName: 'ipag.ttf',
                fontName: 'ipag',
                weight: 'normal',
                data: ipag,
            }
        ]
    })
}, 10000)
*/
