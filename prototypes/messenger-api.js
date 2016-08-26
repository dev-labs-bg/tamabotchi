'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise-native');
const interactive = require('node-wit').interactive
const conf = require('./config.json').fb;

class SessionManager {
    constructor() {
        this.nextId = new Date().getTime();

        this.witId = {};
        this.witContext = {}
    }

    get_wit_id(curFb) {
        if (!(curFb in this.witId)) {
            let curWit = this.nextId.toString();
            this.nextId++;

            this.witId[curFb] = curWit;
            this.witContext[curWit] = {
                fbId: curFb
            };
        }
        return this.witId[curFb];
    }
    get_wit_context(curWit) {
        if (!(curWit in this.witContext)) {
            console.log('ERR: Invalid wit Id');
            return {}
        } else {
            return this.witContext[curWit];
        }
    }
    set_wit_context(curWit, curContext) {
        this.witContext[curWit] = curContext;
    }
    delete_wit_session(curWit) {
        if (curWit in this.witContext) {
            delete this.witContext[curWit];
        }
        if (curWit in this.fbId) {
            let curFb = this.fbId[curWit];

            delete this.witId[curFb];
        }
    }
};

module.exports.get_messenger_wit_server = (wit) => {
    let app = express();

    app.use(bodyParser.json());

    app.get(conf.webhook_endpoint, (req, res) => {
        if ((req.query['hub.mode'] === 'subscribe') && 
            (req.query['hub.verify_token'] === conf.verify_token)) {
                res.status(200).send(req.query['hub.challenge']);
            } else {
                console.log('Verification failed');
                res.status(403);
            }
    });

    let sessionManager = new SessionManager();

    app.post(conf.webhook_endpoint, (req, res) => {
        let data = req.body;

        if (data.object !== 'page') {
            res.sendStatus(404);
            return;
        }
        data.entry.forEach(entry => {
            entry.messaging.forEach(event => {
                if (event.message) {
                    const {text, attachments} = event.message;
                    if ((attachments) || (!text)) {
                        send_text_message('I understand only text messages');
                    } else {
                        const fbId = event.sender.id;
                        const witId = sessionManager.get_wit_id(fbId);
                        const witContext = sessionManager.get_wit_context(witId);
                        console.log(`received ${text} from ${fbId} (wit: ${witId})`);

                        wit.runActions(
                            witId,
                            text,
                            witContext
                        ).then((newContext) => {
                            if (newContext.quickreplies) {
                                delete newContext.quickreplies;
                            }
                            if (newContext.deleteSession) {
                                sessionManager.delete_wit_session(witId);
                            } else {
                                sessionManager.set_wit_context(witId, newContext);
                            }
                        });
                    }
                } else {
                    console.log('Received unknnown event', event);
                }

            });
        });

        res.sendStatus(200);
    });
    return app;
};

module.exports.process_quick_replies = (quick_replies = []) => {
    let ans = [];
    quick_replies.forEach(rep => {
        ans.push({
            content_type: 'text',
            title: rep,
            payload: rep
        })
    });
    //sending an empty array to the Messenger API throws an error
    if (ans.length == 0) {
        return undefined;
    } else {
        return ans;
    }
};

function send_json(messageData) {
    return request({
        uri: conf.api_endpoint,
        qs: {access_token: conf.access_token},
        method: 'POST',
        json: messageData
    });
}
function send_text_message(userId, text, quick_replies = []) {
    return send_json({
        recipient: {
            id: userId
        }, 
        message: {
            text: text,
            quick_replies: process_quick_replies(quick_replies)
        }
    }).then(() => {
        console.log(`${text} sent to ${userId}`);
    }).catch(err => {  
        console.log(err);
    });;
}

module.exports.send = (request, response) => {
    let fbId = request.context.fbId;

    let quickreplies = [];
    if (response.quickreplies) {
        quickreplies = response.quickreplies;
    }

    if (request.context.quickreplies) {
       quickreplies = quickreplies.concat(request.context.quickreplies);
    }
    delete request.context.quickreplies;
    //console.log(fbId, response.text, quickreplies);
    return send_text_message(fbId, response.text, quickreplies);
};
