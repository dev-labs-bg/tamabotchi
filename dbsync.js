'use strict'
if (require.main === module) {
    require('./models.js');
}
const request = require('request-promise-native');
const crypto = require('crypto');
const mongoose = require('mongoose'),
    Question = mongoose.model('Question');
const later = require('later');
const conf = require('./config.json');

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
    })

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
    let syncSchedule = later.parse.text(conf.dbsync_schedule);
    later.setInterval(module.exports.sync, syncSchedule);
};

if (require.main === module) {
    //Do a sync now
    module.exports.sync().then(docs => {
        console.log(`${docs.length} questions inserted`);
        mongoose.connection.close();
    }).catch(err => {
        console.log(err);
        mongoose.connection.close();
    });
}

