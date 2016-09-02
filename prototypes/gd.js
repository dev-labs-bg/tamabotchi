'use strict'
require('../models.js');
const gd = require('node-gd');
const mongoose = require('mongoose');
const progression = require('../progression.js');

progression.generate_session_image(2000, 1000).then(res => {
    console.log('success', res);
    mongoose.connection.close();
}).catch(err => {
    console.log(err);
});

/*let img = gd.createTrueColor(200, 200, (error, img) => {
    img.colorAllocate(0, 69, 69);

    let foregroundColor = gd.trueColor(255, 153, 153);
    let edgeColor = gd.trueColor(255, 102, 102);

    let font = '../helvetica.ttf';

    img.filledArc(100, 50, 30, 40, 0, 360, gd.trueColorAlpha(255, 255, 0, 120), 4);
    img.filledRectangle(90, 60, 110, 190, foregroundColor);
    img.filledArc(90, 170, 60, 40, 90, 270, edgeColor, 4);
    img.filledArc(110, 170, 60, 40, 270, 90, edgeColor, 4);

    let textColor = img.colorAllocate(51, 153, 255);

    let text = 'curec';
    let fontSize = 20;
    let box = img.stringFTBBox(textColor, font, fontSize, 0, 0, 0, text);
    let x = Math.round((200 - (box[2] - box[0])) / 2);
    img.stringFT(textColor, font, 20, 0, x, 25, text);


    img.savePng('output.png', 0, (err) => {
        img.destroy();
        if (err) {
            console.log('TIFU');
            console.log(err);
        }
    });
});*/
