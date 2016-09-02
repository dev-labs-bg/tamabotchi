const mongoose = require('mongoose');
const level = require('../level.js');

const schema = new mongoose.Schema({
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
schema.statics.findByFbId = function(fbId) {
    let User = mongoose.model('User');
    return User.findOne({'fbId': fbId}).then(user => {
        if (user === null) {
            return new User({fbId: fbId}).save();
        } else {
            return Promise.resolve(user);
        }
    })
};
schema.methods.getLevel = function() {
    return level.level_from_xp(this.xp);
};
schema.methods.xpForNextLevel = function() {
    return level.xp_for_next_level(this.xp);
};

module.exports = mongoose.model('User', schema);

