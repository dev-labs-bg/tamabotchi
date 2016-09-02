'use strict';
const co = require('co');
const botkit = require('botkit');
const mongoose = require('mongoose');
const messengerMiddleware = require('../middleware/messenger.js');

const config = require('../config.json');
const trivia = require('../services/trivia.js');
const progression = require('../services/progression');

const User = require('../models/user.js');

let controller = botkit.facebookbot({
    access_token: config.FB.ACCESS_TOKEN,
    verify_token: config.FB.VERIFICATION_TOKEN
});
controller.middleware.send.use(messengerMiddleware.quickReplies);
controller.middleware.send.use(messengerMiddleware.image);

let bot = controller.spawn({});

controller.hears([/\bhello\b/i, /\bhi\b/i, /\bhowdy\b/i, /\bhey\b/i], 
        'message_received', (bot, message) => {
    bot.reply(message, `Hey, didn't see you there. If you need anything, ` + 
              `just type "help"`);
});
controller.hears([/\bhelp\b/i], 'message_received', (bot, message) => {
    bot.reply(message, {
        text: `To start a game type "play", to view your progress type`
            + ` "progress"`,
        quick_replies: ['Play a game', 'View progress']
    });
});
function playGame(convo) {
    co(function* () {
        let selectCategoryRes = yield trivia.selectCategory(convo);

        convo = selectCategoryRes.convo;
        let category = selectCategoryRes.category;

        convo.say(`Preparing questions from ${category.title}...`);
        convo.next();

        let fbId = convo.source_message.user;
        let user = yield User.findByFbId(fbId);

        let questions = yield trivia.generateQuestionList(user, category);
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
                        playGame(convo);
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

        let askQuestionRes = yield trivia.askQuestions({user, questions, convo});
        convo = askQuestionRes.convo;

        let gainedXp = yield progression.calculateSessionXp(user,
            askQuestionRes.answeredQuestions);

        let sessionProgression = yield progression.sessionProgression(user, gainedXp);
        convo.say(sessionProgression);
        convo.next();

        user.xp += gainedXp;
        user.save();

    });
}
controller.hears([/\bplay\b/i], 'message_received', (bot, message) => {
    bot.startConversation(message, (err, convo) => {
        playGame(convo);
    });
});
controller.hears([/\bstats\b/i, /\bprogression\b/i, /\bprogress\b/i, /\bxp\b/i],
        'message_received', (bot, message) => {
    User.findByFbId(message.user).then(user => {
        return progression.userProgression(user);
    }).then(reply => {
        bot.reply(message, reply);
    });
});
controller.on('message_received', (bot, message) => {
    bot.reply(message, {
        text: 'Well, I\'m not sure I understand. If you need a hand, type'
            + ' "help"',
        quick_replies: ['help'],
    });
    return false;
 });

module.exports.setupServer = () => {
    return new Promise((resolve, reject) => {
        controller.setupWebserver(config.BOTKIT_PORT, (err, webserver) => {
            if (err) {
                reject(err);
            } else {
                controller.createWebhookEndpoints(webserver, bot, resolve);
            }
        });
    });
};
