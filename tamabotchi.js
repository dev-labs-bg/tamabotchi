const express = require('express');
const bodyParser = require('body-parser');
const request = require('request-promise-native');
const conf = require('./config.json');

const app = express();
app.use(bodyParser.json());

app.get('/messenger', (req, res) => {
    console.log('messenger');
    console.log(req.query);
    const VERIFY_TOKEN = 'I_AM_A_VERIFY_TOKEN_1337';
    if ((req.query['hub.mode'] === 'subscribe') && 
            (req.query['hub.verify_token'] === VERIFY_TOKEN)) {
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.log('Verification failed');
        res.status(403);
    }
});

function sendAPI(messageData) {
    return request({
        uri: conf.FB_API_ENDPOINT,
        qs: {access_token: conf.FB_ACCESS_TOKEN},
        method: 'POST',
        json: messageData
    });
}

function sendTextMessage(userId, text) {
    return sendAPI({
        recipient: {
            id: userId
        }, 
        message: {
            text: text
        }
    }).then(() => {
        console.log(`${text} sent to ${userId}`);
    })
}

function receivedMessage(event) {
    if (event.message.text) {
        console.log(`${event.sender.id}: ${event.message.text}`);
        sendTextMessage(event.sender.id, 'meow');
    } 
}

app.post('/messenger', (req, res) => {
    let data = req.body;

    if (data.object !== 'page') {
        res.sendStatus(404);
        return;
    }
    data.entry.forEach(entry => {
        entry.messaging.forEach(event => {
            if (event.message) {
                receivedMessage(event);
            } else {
                console.log('Unknown message type', event);
            }

        });
    });

    res.sendStatus(200);
});

app.listen(8000, () => {});
