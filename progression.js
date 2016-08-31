const co = require('co');
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

module.exports.calculate_session_xp = (user, answeredQuestions) => {
    console.log('At least it\'s called');
    console.log(user);
    console.log(answeredQuestions);
    return co(function*() {
        console.log('Co ?');
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
