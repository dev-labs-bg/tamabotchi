'use strict';
const mongoose = require('mongoose');
const Question = mongoose.model('Question');
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
                convo.say('We don\'t have THAT difficult questions. Pick something reasonable.');
                convo.next();
                resolve(pick_difficulty(convo));
            }
        });
    });
}

module.exports = {
    select_game_mode: convo => {
        return pick_category(convo, categories).then(({category, convo}) => {
            return pick_difficulty(convo).then(({difficulty, convo}) => {
                return Promise.resolve({
                    convo: convo,
                    gamemode: {
                        category: category,
                        difficulty: difficulty
                    }
                });
            });
        });
    }, 
    generate_question_list: (user, gamemode) => {
        console.log('generate quesitons');
        return Question.aggregate({
            $match: {
                category: gamemode.category.key,
                difficulty: gamemode.difficulty
            }
        }).sample(QUESTIONS_PER_SESSION).exec();
    }
};
