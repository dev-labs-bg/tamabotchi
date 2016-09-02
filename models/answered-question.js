'use strict';
const mongoose = require('mongoose');
const Question = require('./question.js');

const schema = new mongoose.Schema({ 
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: 'hashed'
    },
    question: Question.schema,
    givenAnswer: String,
    answeredCorrectly: Boolean,
    timeAnswered: Date,
    notAskedUntil: {
        type: Date,
        index: true
    }
});

module.exports = mongoose.model('AnsweredQuestion', schema);
