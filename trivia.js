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

function pick_category(convo, curCategory, callback) {
    if (curCategory.subcategories) {

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
                pick_category(convo, newCategory, callback);
            } else if ((/^back$/i.test(response.text)) && (curCategory.parent)) {
                pick_category(convo, curCategory.parent, callback);
            } else {
                convo.say('That \'s not a valid choice');
                convo.next();
                pick_category(convo, curCategory, callback);
            }
        });
    } else {
        callback(curCategory, convo);
    }
}
function pick_difficulty(convo, callback) {
    const difficulties = ['easy', 'medium', 'hard'];
    let question = {
        text: 'How difficult questions do you want ?',
        quick_replies: difficulties
    };
    convo.ask(question, (response, convo) => {
        if (difficulties.includes(response.text)) {
            convo.next();
            callback(response.text, convo);
        } else {
            convo.say('We don\'t have THAT difficult questions. Pick something reasonable.');
            convo.next();
            pick_difficulty(convo, callback);
        }
    });
}

module.exports = {
    select_game_mode: (convo, callback) => {
        pick_category(convo, categories, (category, convo) => {
            pick_difficulty(convo, (difficulty, convo) => {
                callback({
                    category: category,
                    difficulty: difficulty
                }, convo);
            });
        });
    }, get 
};
