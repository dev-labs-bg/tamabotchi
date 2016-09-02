const gd = require('node-gd');
const config = require('../../config.json');
const randomstring = require('randomstring');
const level = require('./level.js');

const GENERATED_IMAGES_DIR = '/generated/';
const GENERATED_IMAGES_FILEPATH = '.' + config.WEB.PUBLIC_ROOT 
        + GENERATED_IMAGES_DIR;
const GENERATED_IMAGES_URL = config.WEB.ROOT_URL + GENERATED_IMAGES_DIR;

const PNG_COMPRESSION = 5;

const IMAGE_WIDTH = 300;

//Relative to the root direcotory
const FONT = './resources/fonts/roboto-regular.ttf';
const FONT_SIZE = 15;
const PADDING = 15;
const LINE_SPACING = 5;

const COLOR = {
    BACKGROUND: gd.trueColor(240, 240, 240),
    TEXT: gd.trueColor(10, 10, 10),
    BAR_BORDER: gd.trueColor(10, 10, 10),
    BAR_OLD_XP: gd.trueColor(52, 153, 255),
    BAR_NEW_XP: gd.trueColor(46, 184, 46)
};

function rowY(r) {
    return PADDING + (r - 1) * (FONT_SIZE + LINE_SPACING);
}
function textRowY(r) {
    return FONT_SIZE + rowY(r);
}
function rowH(r) {
    return 2 * PADDING + r * FONT_SIZE + Math.max(0, r - 1) * LINE_SPACING;
}
function textWidth(image, text, fontSize = FONT_SIZE, font = FONT) {
    let boundingBox = image.stringFTBBox(0xffffff, font, fontSize, 0, 0, 0, text);
    //xLowerRight - xLowerLet
    return Math.ceil(boundingBox[2] - boundingBox[0]);
}

function drawText(image, text, row, align = 'center', color = COLOR.TEXT) {
    let y = textRowY(row);

    let width = textWidth(image, text);
    let x;
    if (align === 'left') {
        x = PADDING;
    } else if (align === 'right') {
        x = IMAGE_WIDTH - width - PADDING;
    } else {
        x = Math.floor((IMAGE_WIDTH - width) / 2);
    } 

    image.stringFT(color, FONT, FONT_SIZE, 0, x, y, text);
}
function drawXpBar(image, prevXp, row, gainedXp = 0) {
    let curLevel = level.levelFromXp(prevXp + gainedXp);
    let nextLevel = curLevel + 1;

    let curXp = (prevXp + gainedXp) - level.xpForLevel(curLevel);
    let levelXp = level.xpForLevel(nextLevel) - level.xpForLevel(curLevel);

    drawText(image, `lvl ${curLevel}`, row, 'left');
    drawText(image, `${curXp} / ${levelXp}`, row, 'center');
    drawText(image, `lvl ${nextLevel}`, row, 'right');
                      
    let barY1 = rowY(row + 1);
    let barY2 = rowY(row + 1) + FONT_SIZE;
    let barX1 = PADDING;
    let barX2 = IMAGE_WIDTH - PADDING;
    let barWidth = barX2 - barX1;

    let leveledUp = curXp < gainedXp;

    let prevXpWidth = leveledUp
        ? 0
        : Math.floor((curXp - gainedXp) / levelXp * barWidth);
    let prevXpX1 = barX1;
    let prevXpX2 = prevXpX1 + prevXpWidth;

    let gainedXpWidth = leveledUp
        ? Math.floor(curXp / levelXp * barWidth)
        : Math.floor(gainedXp / levelXp * barWidth);
    let gainedXpX1 = prevXpX2;
    let gainedXpX2 = gainedXpX1 + gainedXpWidth;

    image.filledRectangle(prevXpX1, barY1, prevXpX2, barY2, COLOR.BAR_OLD_XP);
    image.filledRectangle(gainedXpX1, barY1, gainedXpX2, barY2, COLOR.BAR_NEW_XP);

    image.rectangle(barX1, barY1, barX2, barY2,COLOR.BAR_BORDER);
}

function saveImage(image) {
    return new Promise((resolve, reject) => {
        let fileName = randomstring.generate() + '.png';
        let filePath = GENERATED_IMAGES_FILEPATH + fileName;
        let url = GENERATED_IMAGES_URL + fileName;

        image.savePng(filePath, PNG_COMPRESSION, err => {
            image.destroy();
            if (err) {
                reject(err);
            } else {
                resolve(url);
            }
        });
    });
}
function generateSessionImage(prevXp, gainedXp) {
    return new Promise((resolve, reject) => {
        let hasLeveled = (level.xpForNextLevel(prevXp) <= prevXp + gainedXp);

        const IMAGE_HEIGHT = hasLeveled
            ? rowH(4)
            : rowH(3);

        gd.createTrueColor(IMAGE_WIDTH, IMAGE_HEIGHT, (err, image) => {
            if (err) {
                reject(err);
                return;
            }

            image.filledRectangle(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT, 
                                COLOR.BACKGROUND);

            drawText(image, `+ ${gainedXp} xp`, 1, 'center');
            drawXpBar(image, prevXp, 2, gainedXp);

            if (hasLeveled) {
                drawText(image, `LEVEL UP !!!`, 4, 'center');
            }
            resolve(image);
        });
    });
}
function generateProgressionImage(xp) {
    return new Promise((resolve, reject) => {
        const IMAGE_HEIGHT = rowH(2);
        return gd.createTrueColor(IMAGE_WIDTH, IMAGE_HEIGHT, (err, image) => {
            if (err) {
                reject(err);
                return;
            }
            image.filledRectangle(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT, 
                                COLOR.BACKGROUND);
            drawXpBar(image, xp, 1);
            resolve(image);
        });
    });
}

module.exports.getSessionImage = (prevXp, gainedXp) => {
    return generateSessionImage(prevXp, gainedXp)
    .then(saveImage);
};

module.exports.getProgressionImage = (xp) => {
    return generateProgressionImage(xp)
    .then(saveImage);
};

