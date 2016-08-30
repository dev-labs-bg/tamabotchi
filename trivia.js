'use strict';
const co = require('co');
const mongoose = require('mongoose');
const Question = mongoose.model('Question');
const shuffle = require('knuth-shuffle').knuthShuffle;
const QUESTIONS_PER_SESSION = 10;

//adds the property `parent` and the method choose
function process_categories(raw) {
    function process(curCategory) {
        if (curCategory.parent === undefined) {
            curCategory.parent = null;
        }
        if (curCategory.subcategories) {
            curCategory.subcategories.forEach((subcategory) => {
                subcategory.parent = curCategory;
                process(subcategory);
            });
        }
    }

    process(raw);

    return raw;
}
const categories = process_categories(require('./categories.json'));

function pick_category(convo, curCategory) {
    return new Promise((resolve, reject) => {
        if (!curCategory.subcategories) {
            resolve({
                category: curCategory,
                convo: convo
            });
            return;
        }

        let question = {};
        if (curCategory.title) {
            question.text = `Pick a subcategory of ${curCategory.title} ` +
                `(or type "Back")`;
        } else {
            question.text = 'Pick a category';
        }

        question.quick_replies = [];
        curCategory.subcategories.forEach(sub => {
            question.quick_replies.push(sub.title); 
        });

        convo.ask(question, (response, convo) => {
            console.log(curCategory.parent);
            let newCategory = null;
            curCategory.subcategories.forEach(cat => {
                if (cat.title === response.text) {
                    newCategory = cat;
                }
            });

            convo.next();
            if (newCategory) {
                resolve(pick_category(convo, newCategory));
            } else if ((/^back$/i.test(response.text)) && (curCategory.parent)) {
                resolve(pick_category(convo, curCategory.parent));
            } else {
                convo.say('That \'s not a valid choice');
                convo.next();
                resolve(pick_category(convo, curCategory));
            }
        });
    });
}
function pick_difficulty(convo) {
    return new Promise((resolve, reject) => {
        const difficulties = ['easy', 'medium', 'hard'];
        let question = {
            text: 'How difficult questions do you want ?',
            quick_replies: difficulties
        };
        convo.ask(question, (response, convo) => {
            if (difficulties.includes(response.text)) {
                convo.next();
                resolve({
                    difficulty:response.text,
                    convo: convo
                });
            } else {
                convo.say('We don\'t have THAT difficult questions. Pick ' +
                          'something reasonable.');
                convo.next();
                resolve(pick_difficulty(convo));
            }
        });
    });
}

function ask_questions({user, questions, convo}) {
    return new Promise((resolve, reject) => {
        if (!questions.length) {
            resolve(convo);
            return;
        }

        let question = questions[questions.length - 1];

        let curAsk = {
            text: question.question,
            quick_replies: []
        };

        let answers = question.incorrectAnswers
            .concat(question.correctAnswer);
        answers = shuffle(answers);

        if (question.type === 'multiple') {
            let ansLetter = 'A';
            answers.forEach(ans => {
                curAsk.text += `\n ${ansLetter}: ${ans}`;
                curAsk.quick_replies.push(ansLetter);
                ansLetter = String.fromCharCode(ansLetter.charCodeAt(0) + 1);
            });
        } else {
            curAsk.quick_replies = ['True', 'False'];
        }

        convo.ask(curAsk, (response, convo) => {
            if (curAsk.quick_replies.includes(response.text)) {
                let correct = false;
                if (question.type === 'multiple') {
                    let id = response.text.charCodeAt(0) - 'A'.charCodeAt(0);
                    correct = answers[id] === question.correctAnswer;
                } else {
                    correct = response.text === question.correctAnswer;
                }

                if (correct) {
                    convo.say('Correct !!!');
                    convo.next();
                    questions.pop();
                } else {
                    convo.say('Wrong answer');
                    convo.next();
                    questions.pop();
                }
            } else {
                convo.say('I didn\'t quite understand you. '
                          + 'Let\'s try again');
                          convo.next();
            }
            resolve(ask_questions({user, questions, convo}));
        });
    });
}

module.exports = {
    select_game_mode: convo => {
        return co(function* () {
            let categoryRes = yield pick_category(convo, categories);
            let difficultyRes = yield pick_difficulty(categoryRes.convo);
            let ans = {
                convo: difficultyRes.convo,
                gamemode: {
                    category: categoryRes.category,
                    difficulty: difficultyRes.difficulty
                }
            };
            console.log(ans.gamemode);
            return yield Promise.resolve(ans);
        });
    }, 
    generate_question_list: (user, gamemode) => {
        //console.log('generate quesitons');
        return Question.aggregate({
            $match: {
                category: gamemode.category.key,
                difficulty: gamemode.difficulty
            }
        }).sample(QUESTIONS_PER_SESSION).exec();
    }, 
    ask_questions: ask_questions
};
