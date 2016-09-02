'use strict'

const crypto = require('crypto');
const HtmlEntities = require('html-entities').AllHtmlEntities;
const later = require('later');
const mongoose = require('mongoose');
const request = require('request-promise-native');

const config = require('./config.json');
const Question = require('./models/question.js');

//fetches the whole database from http://opentdb.com
function getTriviaDb() {
    const BASE_URL = 'http://www.opentdb.com/';
    
    return request(`${BASE_URL}api_token.php?command=request`).then(body => {
        let response = JSON.parse(body);
        if (response.response_code !== 0) {
            return Promise.reject('Error obtaining api token');
        } else {
            return response.token;
        }
    }).then(token => {
        return (function fetchQuestions(perQuery = 50) {
            let url = `${BASE_URL}api.php?amount=${perQuery}&token=${token}`;
            return request(url).then(body => {
                let resp = JSON.parse(body),
                    code = resp.response_code;

                if ((code === 4) || (code === 1)) {
                    if (perQuery == 1) {
                        return Promise.resolve([]);
                    } else {
                        return fetchQuestions(Math.floor(perQuery / 2));
                    }
                } else if (code === 0) {
                    return fetchQuestions(perQuery).then(ans => {
                        return ans.concat(resp.results);
                    });
                } else {
                    return Promise.reject('Error fetching questions');
                }
            });
        })();
    });
}
function formatQuestions(questions) {
    let entities = new HtmlEntities();
    questions.forEach(q => {
        q.category = entities.decode(q.category);
        q.question = entities.decode(q.question);

        q.correctAnswer = entities.decode(q.correct_answer);
        delete q.correct_answer;

        q.incorrectAnswers = [];
        q.incorrect_answers.forEach(ans => {
            q.incorrectAnswers.push(entities.decode(ans));
        });
        delete q.incorrect_answers;
    });
    return questions;
}

function hashStr(str) {
    return crypto.createHash('sha256').update(str).digest('base64');
}

module.exports.sync = () => {
    let getHashes = Question.find().select('hash').exec().then(db => {
        let hashList = [];
        db.forEach(entry => {
            hashList.push(entry.hash);
        });
        return new Set(hashList);
    });

    let getQuestions = getTriviaDb().then(formatQuestions);

    return Promise.all([getQuestions, getHashes]).then(res => {
        let newQuestions = res[0];
        let hashSet = res[1];

        let insertList = [];
        newQuestions.forEach(q => {
            q.hash = hashStr(JSON.stringify(q));
            if (!hashSet.has(q.hash)) {
                insertList.push(q);
            }
        });
        if (insertList.length) {
            return Question.insertMany(insertList);
        } else {
            return Promise.resolve([]);
        }
    });
};
module.exports.scheduleSync = () => {
    later.date.localTime();
    let syncSchedule = later.parse.text(config.DB.SYNC_SCHEDULE);
    later.setInterval(module.exports.sync, syncSchedule);
};

if (require.main === module) {
    mongoose.Promise = global.Promise;
    mongoose.connect(config.DB.MONGO_URL);
    
    //Do a sync now
    module.exports.sync().then(docs => {
        console.log(`${docs.length} questions inserted`);
        mongoose.connection.close();
    }).catch(err => {
        console.log(err);
        mongoose.connection.close();
    });
}

