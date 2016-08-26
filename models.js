const mongoose = require('mongoose');
const conf = require('./config.json');
const hash_fuction = require('crypto').createHash('sha256');

mongoose.Promise = global.Promise;
mongoose.connect(conf.mongodb_url);

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
    correct_answer: String,
    incorrect_answers: [String]
});

const userSchema = new mongoose.Schema({
    fbId: {
        type: String,
        index: true
    }
});

const answeredQuestionSchema = new mongoose.Schema({ 
    userId: {
        type: String,
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
