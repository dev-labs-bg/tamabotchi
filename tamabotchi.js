require('./models.js');
const conf = require('./config.json');
const browsing = require('./browsing.js');
const Botkit = require('botkit');
const quick_replies_middleware = require('./quick_replies_middleware.js');

require('./dbsync.js').schedule_sync();

let controller = Botkit.facebookbot({
    debug: true,
    access_token: conf.fb.access_token,
    verify_token: conf.fb.verify_token
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
    bot.startConversation(message, (err, convo) => {
        browsing.select_game_mode(convo, (gm, convo) => {
            convo.say(`So you want ${gm.difficulty} questions ` +
                      `from ${gm.category.title}`);
            convo.next();
        });
    });
});
