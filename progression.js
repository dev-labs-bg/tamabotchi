const co = require('co');
const gd = require('node-gd');
const mongoose = require('mongoose');
const randomstring = require('randomstring');

const config = require('./config.json');
const level = require('./level.js');
const AnsweredQuestion = mongoose.model('AnsweredQuestion');
const User = mongoose.model('User');

const BASE_XP = {
    'easy': 15,
    'medium': 20,
    'hard': 25
};
const WRONG_ANSWER_MULT = 0.2;
const PREVIOUSLY_CORRECT_MULT = 0.3;


const GENERATED_IMAGES_DIR = '/generated/';
const GENERATED_IMAGES_FILEPATH = '.' + config.WEB.PUBLIC_ROOT 
        + GENERATED_IMAGES_DIR;
const GENERATED_IMAGES_URL = config.WEB.ROOT_URL + GENERATED_IMAGES_DIR;

const PNG_COMPRESSION = 5;

const IMAGE_WIDTH = 300;

const FONT = './fonts/roboto-regular.ttf';
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

function draw_text(image, text, row, align = 'center', color = COLOR.TEXT) {
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
function draw_bar(image, prevXP, row, gainedXP = 0) {
    let curLevel = level.level_from_xp(prevXP + gainedXP);
    let nextLevel = curLevel + 1;

    let curXP = (prevXP + gainedXP) - level.xp_for_level(curLevel);
    let levelXP = level.xp_for_level(nextLevel) - level.xp_for_level(curLevel);

    draw_text(image, `lvl ${curLevel}`, row, 'left');
    draw_text(image, `${curXP} / ${levelXP}`, row, 'center');
    draw_text(image, `lvl ${nextLevel}`, row, 'right');
                      
    let barY1 = rowY(row + 1);
    let barY2 = rowY(row + 1) + FONT_SIZE;
    let barX1 = PADDING;
    let barX2 = IMAGE_WIDTH - PADDING;
    let barWidth = barX2 - barX1;

    let leveledUp = curXP < gainedXP;

    let prevXPWidth = leveledUp
        ? 0
        : Math.floor((curXP - gainedXP) / levelXP * barWidth);
    let prevXPx1 = barX1;
    let prevXPx2 = prevXPx1 + prevXPWidth;

    let gainedXPWidth = leveledUp
        ? Math.floor(curXP / levelXP * barWidth)
        : Math.floor(gainedXP / levelXP * barWidth);
    let gainedXPx1 = prevXPx2;
    let gainedXPx2 = gainedXPx1 + gainedXPWidth;

    image.filledRectangle(prevXPx1, barY1, prevXPx2, barY2, COLOR.BAR_OLD_XP);
    image.filledRectangle(gainedXPx1, barY1, gainedXPx2, barY2, COLOR.BAR_NEW_XP);

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
function generate_session_image(prevXP, gainedXP) {
    return new Promise((resolve, reject) => {
        let hasLeveled = (level.xp_for_next_level(prevXP) <= prevXP + gainedXP);

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

            draw_text(image, `+ ${gainedXP} xp`, 1, 'center');
            draw_bar(image, prevXP, 2, gainedXP);

            if (hasLeveled) {
                draw_text(image, `LEVEL UP !!!`, 4, 'center');
            }
            resolve(image);
        });
    });
}
function generate_progression_image(xp) {
    return new Promise((resolve, reject) => {
        const IMAGE_HEIGHT = rowH(2);
        return gd.createTrueColor(IMAGE_WIDTH, IMAGE_HEIGHT, (err, image) => {
            if (err) {
                reject(err);
                return;
            }
            image.filledRectangle(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT, 
                                COLOR.BACKGROUND);
            draw_bar(image, xp, 1);
            resolve(image);
        });
    });
}

module.exports.calculate_session_xp = (user, answeredQuestions) => {
    return co(function*() {
        let sessionQuestionIds = [];
        answeredQuestions.forEach(ans => {
            sessionQuestionIds.push(ans.question._id);
        });
        
        let previouslyCorrectIds = yield AnsweredQuestion.find({
            'question._id': {
                $in: sessionQuestionIds
            },
            answeredCorrectly: true
        })
        .distinct('question._id')
        .exec();

        let previouslyCorrectIdStrings = new Set();
        previouslyCorrectIds.forEach(idObj => {
            previouslyCorrectIdStrings.add(idObj.toString());
        });

        let gainedXP = 0;
        answeredQuestions.forEach(ans => {
            let curXP = BASE_XP[ans.question.difficulty];
            if (!ans.answeredCorrectly) {
                curXP *= WRONG_ANSWER_MULT;
            }

            if (previouslyCorrectIdStrings.has(ans.question._id.toString())) {
                curXP *= PREVIOUSLY_CORRECT_MULT;
            }
            gainedXP += curXP;
        });

        gainedXP = Math.round(gainedXP);
        AnsweredQuestion.insertMany(answeredQuestions);

        return gainedXP;
    });
};
module.exports.sessionProgression = (user, gainedXP) => {
    return generate_session_image(user.xp, gainedXP)
    .then(saveImage)
    .then(imageUrl => {
        return Promise.resolve({
            attachment: {
                image: imageUrl
            }
        });
        
        return Promise.resolve({convo, user});
    });
};
module.exports.userProgression = (user) => {
    return generate_progression_image(user.xp)
    .then(saveImage)
    .then(imageUrl => {
        return Promise.resolve({
            attachment: {
                image: imageUrl
            }
        });
    })

};
