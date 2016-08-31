'use strict';
const co = require('co');
const botkit = require('botkit');
const mongoose = require('mongoose');
const quick_replies_middleware = require('./quick_replies_middleware.js');

require('./models.js');
const config = require('./config.json');
const trivia = require('./trivia.js');
const progression = require('./progression.js');
const schedule_sync = require('./dbsync.js').schedule_sync;

const User = mongoose.model('User');
schedule_sync();

let controller = botkit.facebookbot({
    //debug: true,
    access_token: config.FB.ACCESS_TOKEN,
    verify_token: config.FB.VERIFICATION_TOKEN
});
controller.middleware.send.use(quick_replies_middleware);

let bot = controller.spawn({});
controller.setupWebserver(8000, (err, webserver) => {
    controller.createWebhookEndpoints(webserver, bot, () => {
        console.log('ONLINE\n');
    });
});

controller.hears([/\bhello\b/i, /\bhi\b/i, /\bhowdy\b/i, /\bhey\b/i], 
                 'message_received', (bot, message) => {
    console.log('heard him');
    bot.reply(message, `Hey, didn't see you there. If you need anything, ` + 
              `just type "help"`);
});

controller.hears([/\bhelp\b/i], 'message_received', (bot, message) => {
    console.log(message);
    bot.reply(message, {
        text: `I'm a simple bot and currently support a singe thing: playing`,
        quick_replies: ['play']
    });
});

function play_game(convo) {
    co(function* () {
        /*let selectCategoryRes = yield trivia.select_category(convo);

        convo = selectCategoryRes.convo;
        let category = selectCategoryRes.category;*/
             let category = {
title: 'Mathematics (mock)',
key: 'Science: Mathematics'
};

        convo.say(`Preparing questions from ${category.title}...`);
        convo.next();

        let fbId = convo.source_message.user;
        let user = yield User.findByFbId(fbId);
        console.log(user);

        let questions = yield trivia.generate_question_list(user, category);
        if (!questions.length) {
            convo.ask({
                text: `Sorry, but there weren't any questions from `
                + `${category.title} you haven't answered recently. `
                + `Maybe try another category ? :)`,
                quick_replies: ['Yes', 'No']
            }, [
                {
                    pattern: bot.utterances.yes,
                    callback: (response, convo) => {
                        convo.say('OK, let\'s begin');
                        convo.next();
                        play_game(convo);
                    }
                }, {
                    default: true,
                    callback: (response, convo) => {
                        convo.say('If you change your mind, you can always type'
                                  + ' "play". Bye');
                        convo.next();
                    }
                }
            ]);
            return;
        } 
        let askQuestionRes = yield trivia.ask_questions({user, questions, convo});
        convo = askQuestionRes.convo;

        console.log(askQuestionRes);
        //console.log(askQuestionRes.answeredQuestions);
        let gainedXP = yield progression.calculate_session_xp(user,
            askQuestionRes.answeredQuestions);

        convo = progression.display_session_progression(convo, user, gainedXP);
        //convo.say(`Congrats you gained ${gainedXP} experience points (XP)`);
        //convo.next();
    });

}

controller.hears([/\bplay\b/i], 'message_received', (bot, message) => {
    bot.startConversation(message, (err, convo) => {
        play_game(convo);
    });
});

controller.on('message_received', (bot, message) => {
    bot.reply(message, {
        text: 'Well, I\'m not sure I understand. Type "help" for help or "play"'
                + ' to just start a game',
        quick_replies: ['help', 'play'],
    });
    return false;
    //let quick_replies = ['ouou', 'o'];
    //let processed = messenger.process_quick_replies(quick_replies);
    //console.log(message);

    //bot.reply(message, message.text);
});
