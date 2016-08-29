'use strict';
const co = require('co');
const botkit = require('botkit');
const mongoose = require('mongoose');
const quick_replies_middleware = require('./quick_replies_middleware.js');

require('./models.js');
const config = require('./config.json');
const trivia = require('./trivia.js');
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

/*controller.on('message_received', (bot, message) => {
    //bot.reply(message, 'Hahahahahah, I\'m using botkit now :P');
    let quick_replies = ['ouou', 'o'];
    let processed = messenger.process_quick_replies(quick_replies);
    console.log(message);

    bot.reply(message, {
        'text': 'i hate text',
        'quick_replies': processed
    });
});*/

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

controller.hears([/\bplay\b/i], 'message_received', (bot, message) => {
    /*let fbId = message.user;

    User.findByFbId(fbId).then(user => {
        return trivia.generate_question_list(user, {
            category: {
                key: 'General Knowledge'
            },
            difficulty: 'easy'
        });
    }).then(questions => {
        console.log(questions);
    }).catch(err => {
        console.log(err);
    });*/
    bot.startConversation(message, (err, convo) => {
        co(function* () {
            let selectGamemodeAnswer = yield trivia.select_game_mode(convo);

            convo = selectGamemodeAnswer.convo;
            let gamemode = selectGamemodeAnswer.gamemode;

            convo.say(`Preparing ${gamemode.difficulty} questions ` +
                      `from ${gamemode.category.title} ...`);
            convo.next();

            let fbId = convo.source_message.user;
            let user = yield User.findByFbId(fbId);
            console.log(user);
            let questions = yield trivia.generate_question_list(user, gamemode);
            console.log(questions);
            convo = yield trivia.ask_questions({user, questions, convo});
            convo.say('That was it, hope you enjoyed it');
            convo.next();
        });
    });
});

