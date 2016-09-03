'use strict';
const co = require('co');
const mongoose = require('mongoose');
const Question = require('../models/question.js');
const AnsweredQuestion = require('../models/answered-question.js');
const shuffle = require('knuth-shuffle').knuthShuffle;

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const QUESTIONS_PER_SESSION = 8;
const CORRECT_ANSWER_TIMEOUT = 24 * 3600 * 1000;
const WRONG_ANSWER_TIMEOUT = 12 * 3600 * 1000;

//adds the property `parent` and the method choose
function processCategories(raw) {
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
const categories = processCategories(require('../resources/categories.json'));

function selectCategory(convo, curCategory) {
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
                `(or type "Back"): `;
        } else {
            question.text = 'Pick a category: ';
        }

        question.quick_replies = [];
        curCategory.subcategories.forEach(subCategory => {
            question.text += `\n - "${subCategory.title}"`;
            question.quick_replies.push(subCategory.title); 
        });

        convo.ask(question, (response, convo) => {
            let newCategory = null;
            curCategory.subcategories.forEach(cat => {
                if (cat.title === response.text) {
                    newCategory = cat;
                }
            });

            convo.next();
            if (newCategory) {
                resolve(selectCategory(convo, newCategory));
            } else if ((/^back$/i.test(response.text)) && (curCategory.parent)) {
                resolve(selectCategory(convo, curCategory.parent));
            } else if (/^quit$/i.test(response.text)) {
                convo.say('OK, I am leaving you alone. If you change your mind'
                          + ' I\'ll be here. Bye');
                convo.next();
                reject(convo);
            } else {
                convo.say('That \'s not a valid choice (type "quit" to leave)');
                convo.next();
                resolve(selectCategory(convo, curCategory));
            }
        });
    });
}

function askQuestions({user, questions, convo}) {
    return new Promise((resolve, reject) => {
        if (!questions.length) {
            resolve({
                answeredQuestions: [],
                convo: convo
            });
            return;
        }

        let question = questions[0];

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
            curAsk.text += '\n(Answer by typing "A", "B", "C" or "D")';
        } else {
            curAsk.quick_replies = ['True', 'False'];
            curAsk.text += '\n(Answer by typing "True" or "False")';
        }

        convo.ask(curAsk, (response, convo) => {
            if (curAsk.quick_replies.includes(response.text)) {
                let curAnswer = response.text;
                if (question.type === 'multiple') {
                    let id = response.text.charCodeAt(0) - 'A'.charCodeAt(0);
                    curAnswer = answers[id];
                }

                let correct = curAnswer === question.correctAnswer;;
                if (correct) {
                    convo.say('Correct !!!');
                } else {
                    convo.say('Wrong answer');
                    convo.say(`Correct answer is ${question.correctAnswer}`);
                }
                convo.next();
                questions.shift();
                let timeout = correct
                    ? CORRECT_ANSWER_TIMEOUT
                    : WRONG_ANSWER_TIMEOUT;

                let answeredQuestion = new AnsweredQuestion({
                    userId: user._id,
                    question: question,
                    givenAnswer: correct,
                    answeredCorrectly: correct,
                    timeAsked: Date.now(),
                    notAskedUntil: new Date(Date.now() + timeout)
                });

                askQuestions({user, questions, convo}).then(result => {
                    result.answeredQuestions.push(answeredQuestion);
                    resolve(result);
                });

            } else if (/^quit$/i.test(response.text)) {
                convo.say('Well that\'s a shame. Anyways, see you');
                convo.next();
                return;
            } else {
                convo.say('Just tap on one of the available answers, no need to'
                          + ' be creative ;). (Or type "quit")');
                convo.next();
                resolve(ask_questions({user, questions, convo}));
            }
        });
    });
}

module.exports = {
    selectCategory: convo => {
         return selectCategory(convo, categories);
    },
    generateQuestionList: (user, category) => {
        return AnsweredQuestion.find({
            'userId': user._id,
            'question.category': category.key
        })
        .select('question._id question.difficulty notAskedUntil -_id')
        .exec()
        .then(answered => {
            let answeredByDifficulty = {};

            DIFFICULTIES.forEach(difficulty => {
                answeredByDifficulty[difficulty] = [];
            });
            answered.forEach(entry => {
                answeredByDifficulty[entry.question.difficulty]
                    .push(entry.question._id);
            });


            let answeredNotForbiden = [];

            answered.forEach(entry => {
                if (entry.notAskedUntil < Date.now()) {
                    answeredNotForbiden.push(entry.question._id);
                }
            });
            
            let queries = [];
            DIFFICULTIES.forEach(difficulty => {
                queries.push(Question.aggregate({
                        $match: {
                            category: category.key,
                            difficulty: difficulty,
                            _id: {
                                $nin: answeredByDifficulty[difficulty]
                            }
                        }
                    })
                    .sample(QUESTIONS_PER_SESSION)
                    .exec()
                );
            });

            queries.push(Question
                .aggregate({
                    $match: {
                        category: category.key,
                        _id: {
                            $in: answeredNotForbiden
                        }
                    }
                })
                .sample(QUESTIONS_PER_SESSION)
                .exec()
            );

            return Promise.all(queries);
        }).then(queryResults => {
            let questions = [];
            for (let i = 0;i < queryResults.length;i++) {
                for (let j = 0;j < queryResults[i].length;j++) {
                    questions.push(queryResults[i][j]);

                    if (questions.length === QUESTIONS_PER_SESSION) {
                        break;
                    }
                }

                if (questions.length === QUESTIONS_PER_SESSION) {
                    break;
                }
            }
            return Promise.resolve(questions);
        });
    }, 
    askQuestions: askQuestions
};
