//adds the property `parent` and the method choose
function process_categories(raw) {
    function process(cat) {
        if (cat.parent === undefined) {
            cat.parent = null;
        }
        if (cat.subcategories) {
            cat.subcategories.forEach((cat) => {
                cat.parent = this;
                process(cat);
            });
        }
    }

    process(raw);

    return raw;
}
//let categories = process_categories(require('./categories.json'));
const categories = process_categories(require('./categories.json'));

function pick_category(convo, curCategory, callback) {
    if (curCategory.subcategories) {

        let question = {};
        if (curCategory.title) {
            question.text = `Pick a subcategory of ${curCategory.title}`;
        } else {
            question.text = 'Picka a category';
        }

        question.quick_replies = [];
        curCategory.subcategories.forEach(sub => {
            question.quick_replies.push(sub.title); 
        });

        convo.ask(question, (response, convo) => {
            let newCategory = null;
            curCategory.subcategories.forEach(cat => {
                if (cat.title === response.text) {
                    newCategory = cat;
                }
            });
            if (newCategory) {
                convo.next();
                pick_category(convo, newCategory, callback);
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
    let question = {
        text: 'How difficult questions do you want ?',
        quick_replies: ['easy', 'medium', 'hard']
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
    },
};
