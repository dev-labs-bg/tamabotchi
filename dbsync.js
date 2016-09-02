'use strict'
if (require.main === module) {
    require('./models.js');
}
const request = require('request-promise-native');
const crypto = require('crypto');
const mongoose = require('mongoose');
const later = require('later');

const Question = require('./models/question.js');
const config = require('./config.json');

//fetches the whole database from http://opentdb.com
function get_trivia_db() {
    const BASE_URL = 'http://www.opentdb.com/';
    
    return request(`${BASE_URL}api_token.php?command=request`).then(body => {
        let response = JSON.parse(body);
        if (response.response_code !== 0) {
            return Promise.reject('Error obtaining api token');
        } else {
            return response.token;
        }
    }).then(token => {
        return (function fetch_questions(perQuery = 50) {
            let url = `${BASE_URL}api.php?amount=${perQuery}&token=${token}`;
            return request(url).then(body => {
                let resp = JSON.parse(body),
                    code = resp.response_code;

                console.log(perQuery);

                if ((code === 4) || (code === 1)) {
                    if (perQuery == 1) {
                        return Promise.resolve([]);
                    } else {
                        return fetch_questions(Math.floor(perQuery / 2));
                    }
                } else if (code === 0) {
                    return fetch_questions(perQuery).then(ans => {
                        return ans.concat(resp.results);
                    });
                } else {
                    return Promise.reject('Error fetching questions');
                }
            });
        })();
    }).then(questions => {
        //format the questions as in models.js
        questions.forEach(q => {
            q.correctAnswer = q.correct_answer;
            q.incorrectAnswers = q.incorrect_answers;

            delete q.correct_answer;
            delete q.incorrect_answers;
        });
        return Promise.resolve(questions);
    });
}

function hash_str(str) {
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

    return Promise.all([get_trivia_db(), getHashes]).then(res => {
        let newQuestions = res[0];
        let hashSet = res[1];

        let insertList = [];
        newQuestions.forEach(q => {
            q.hash = hash_str(JSON.stringify(q));
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
module.exports.schedule_sync = () => {
    later.date.localTime();
    let syncSchedule = later.parse.text(config.DB.SYNC_SCHEDULE);
    later.setInterval(module.exports.sync, syncSchedule);
};

if (require.main === module) {
    //Do a sync now
    require('./models.js');
    /*get_trivia_db().then(questions => {
        //console.log('hi');
        let categoryCnt = {};
        questions.forEach(q => {
            //console.log(q);
            if (q.category in categoryCnt) {
                categoryCnt[q.category]++;
            } else {
                categoryCnt[q.category] = 1;
            }
        });
        console.log(categoryCnt);
    });*/
    module.exports.sync().then(docs => {
        console.log(`${docs.length} questions inserted`);
        mongoose.connection.close();
    }).catch(err => {
        console.log(err);
        mongoose.connection.close();
    });
}

