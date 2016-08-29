'use strict';
const mongoose = require('mongoose');
const config = require('./config.json');
const hash_fuction = require('crypto').createHash('sha256');

mongoose.Promise = global.Promise;
mongoose.connect(config.DB.MONGO_URL);

const questionSchema = new mongoose.Schema({
    category: {
        type: String,
        index: 'hashed'
    }, 
    difficulty: {
        type: String,
        index: 'hashed'
    },
    hash: {
        type: String,
        index: 'hashed',
        unique: true
    },
    type: String,
    question: String,
    correctAnswer: String,
    incorrectAnswers: [String]
});

const userSchema = new mongoose.Schema({
    fbId: {
        type: String,
        index: true,
        unique: true
    }
});
userSchema.statics.findByFbId = (fbId) => {
    let User = mongoose.model('User');
    return User.findOne({'fbId': fbId}).then(user => {
        console.log(user);
        if (user === null) {
            return new User({fbId: fbId}).save();
        } else {
            return Promise.resolve(user);
        }
    })
};

const answeredQuestionSchema = new mongoose.Schema({ 
    userId: {
        type: userSchema,
        index: 'hashed'
    },
    questionId: String,
    givenAnswer: String,
    answeredCorrectly: String,
    timeAnswered: Date,
    notAskedUntil: {
        type: Date,
        index: true
    }
});

mongoose.model('Question', questionSchema);
mongoose.model('User', userSchema);
mongoose.model('AnsweredQuestion', answeredQuestionSchema);
