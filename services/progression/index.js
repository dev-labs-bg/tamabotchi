const co = require('co');
const mongoose = require('mongoose');

const config = require('../../config.json');
const imageGeneration = require('./image-generation.js');
const AnsweredQuestion = require('../../models/answered-question.js');
const User = require('../../models/user.js');

const BASE_XP = {
    'easy': 15,
    'medium': 20,
    'hard': 25
};
const WRONG_ANSWER_MULTIPLIER = 0.2;
const PREVIOUSLY_CORRECT_MULTIPLIER = 0.3;

module.exports.calculateSessionXp = (user, answeredQuestions) => {
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
                curXP *= WRONG_ANSWER_MULTIPLIER;
            }

            if (previouslyCorrectIdStrings.has(ans.question._id.toString())) {
                curXP *= PREVIOUSLY_CORRECT_MULTIPLIER;
            }
            gainedXP += curXP;
        });

        gainedXP = Math.round(gainedXP);
        AnsweredQuestion.insertMany(answeredQuestions);

        return gainedXP;
    });
};
module.exports.sessionProgression = (user, gainedXP) => {
    return imageGeneration.getSessionImage(user.xp, gainedXP)
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
    return imageGeneration.getProgressionImage(user.xp)
    .then(imageUrl => {
        return Promise.resolve({
            attachment: {
                image: imageUrl
            }
        });
    })
};
