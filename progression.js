const co = require('co');
const gd = require('node-gd');
const level = require('./level.js');
const mongoose = require('mongoose');
const AnsweredQuestion = mongoose.model('AnsweredQuestion');
const User = mongoose.model('User');

const BASE_XP = {
    'easy': 15,
    'medium': 20,
    'hard': 25
};
const WRONG_ANSWER_MULT = 0.2;
const PREVIOUSLY_CORRECT_MULT = 0.3;

const IMAGE_WIDTH = 300;

const FONT = './helvetica.ttf';
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
function textWidth(img, text, fontSize = FONT_SIZE, font = FONT) {
    let boundingBox = img.stringFTBBox(0xffffff, font, fontSize, 0, 0, 0, text);
    //xLowerRight - xLowerLet
    return Math.ceil(boundingBox[2] - boundingBox[0]);
}

function draw_text(img, text, row, align = 'center', color = COLOR.TEXT) {
    let y = textRowY(row);

    let width = textWidth(img, text);
    let x;
    if (align === 'left') {
        x = PADDING;
    } else if (align === 'right') {
        x = IMAGE_WIDTH - width - PADDING;
    } else {
        x = Math.floor((IMAGE_WIDTH - width) / 2);
    } 

    img.stringFT(color, FONT, FONT_SIZE, 0, x, y, text);
}
function draw_bar(img, prevXP, row, gainedXP = 0) {
    let curLevel = level.level_from_xp(prevXP + gainedXP);
    let nextLevel = curLevel + 1;

    let curXP = (prevXP + gainedXP) - level.xp_for_level(curLevel);
    let levelXP = level.xp_for_level(nextLevel) - level.xp_for_level(curLevel);

    draw_text(img, `lvl ${curLevel}`, row, 'left');
    draw_text(img, `${curXP} / ${levelXP}`, row, 'center');
    draw_text(img, `lvl ${nextLevel}`, row, 'right');
                      
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

    img.filledRectangle(gainedXPx1, barY1, gainedXPx2, barY2, COLOR.BAR_NEW_XP);
    img.filledRectangle(prevXPx1, barY1, prevXPx2, barY2, COLOR.BAR_OLD_XP);

    img.rectangle(barX1, barY1, barX2, barY2,COLOR.BAR_BORDER);
}

module.exports.generate_session_image = (prevXP, gainedXP) => {
    return new Promise((resolve, reject) => {
        //console.log(level.xp_for_next_level(prevXP) <= prevXP + gainedXP);
        let hasLeveled = (level.xp_for_next_level(prevXP) <= prevXP + gainedXP);

        const IMAGE_HEIGHT = hasLeveled
            ? rowH(4)
            : rowH(3);

        gd.createTrueColor(IMAGE_WIDTH, IMAGE_HEIGHT, (err, img) => {
            if (err) {
                reject(err);
                return;
            }
            //init_colors(img);

            img.filledRectangle(0, 0, IMAGE_WIDTH, IMAGE_HEIGHT, 
                                COLOR.BACKGROUND);

            draw_text(img, `+ ${gainedXP} xp`, 1, 'center');
            draw_bar(img, prevXP, 2, gainedXP);

            if (hasLeveled) {
                draw_text(img, `LEVEL UP !!!`, 4, 'center');
            }

            img.savePng('output.png', 6, err => {
                if (err) {
                    reject(err);
                } else {
                    resolve('output.png');
                }
            });
        });
    });
}

module.exports.calculate_session_xp = (user, answeredQuestions) => {
    return co(function*() {
        let sessionQuestionIds = [];
        answeredQuestions.forEach(ans => {
            sessionQuestionIds.push(ans.question._id);
        });
        console.log(sessionQuestionIds);
        
        let previouslyCorrectIds = yield AnsweredQuestion.find({
            'question._id': {
                $in: sessionQuestionIds
            },
            answeredCorrectly: true
        })
        .distinct('question._id')
        .exec();

        console.log(previouslyCorrectIds);

        let previouslyCorrectIdStrings = new Set();
        previouslyCorrectIds.forEach(idObj => {
            previouslyCorrectIdStrings.add(idObj.toString());
        });
        console.log(previouslyCorrectIdStrings);

        let gainedXP = 0;
        answeredQuestions.forEach(ans => {
            console.log(ans);
            let curXP = BASE_XP[ans.question.difficulty];
            console.log(curXP);
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

        console.log(gainedXP);
        return gainedXP;
    });
};
module.exports.display_session_progression = (convo, user, gainedXP) => {
    console.log('hi');
    console.log(user.getLevel());
    console.log(user.xpForNextLevel());

    let message = '';
    let prevLevel = user.getLevel();
    user.xp += gainedXP;
    if (prevLevel < user.getLevel()) {
        message = `You gained ${gainedXP} XP and you're now level`
            + ` ${user.getLevel()}. ${user.xpForNextLevel() - user.xp} XP is`
            + ` required for next level`;
    } else {
        message = `You gained ${gainedXP} XP and you're still level`
            + ` ${user.getLevel()}. ${user.xpForNextLevel() - user.xp} XP is`
            + ` required for next level`;
    }
    user.save();

    convo.say(message);
    convo.next();
    return {convo, user};
};
