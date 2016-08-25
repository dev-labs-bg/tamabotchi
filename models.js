const mongoose = require('mongoose');
const conf = require('./config.json');

mongose.connect(conf.mongodb_url);

const questionSchema = new mongoose.Schema({
    category: {
        type: String,
        index: true
    }, 
    type: {
        type: String,
        index: true
    },
    difficulty: String,
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

const answeredQustionSchema = new mongoose.Schema({ 
    userId: {
        type: String,
        index: true
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

module.exports = {
    Question: mongoose.model('Question', questionSchema),
    User: mongoose.model('User', userSchema),
    AnsweredQuestion: mongoose.model('AnsweredQuestion', answeredQuestionSchema);
}

