'use strict';
const mongoose = require('mongoose');
const config = require('./config.json');
const level = require('./level.js');
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
    },
    xp: {
        type: Number,
        default: 0
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
userSchema.methods.getLevel = function() {
    console.log('I xist');
    console.log(this);
    console.log(this.xp);
    console.log(this.model);
    return level.level_from_xp(this.xp);
};
userSchema.methods.xpForNextLevel = function() {
    return level.xp_for_next_level(this.xp);
};

const answeredQuestionSchema = new mongoose.Schema({ 
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: 'hashed'
    },
    question: questionSchema,
    givenAnswer: String,
    answeredCorrectly: Boolean,
    timeAnswered: Date,
    notAskedUntil: {
        type: Date,
        index: true
    }
});

mongoose.model('Question', questionSchema);
mongoose.model('User', userSchema);
mongoose.model('AnsweredQuestion', answeredQuestionSchema);
