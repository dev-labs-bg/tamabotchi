'use strict';
const mongoose = require('mongoose');

const schema = new mongoose.Schema({
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

module.exports = mongoose.model('Question', schema);
