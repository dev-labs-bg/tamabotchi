//lvl = Math.floor(LEVEL_CONSTANT * sqrt(totalXP)) + 1;
const LEVEL_CONSTANT = 0.1

module.exports = {
    levelFromXp: xp => {
        return Math.floor(LEVEL_CONSTANT * Math.sqrt(xp)) + 1;
    },
    xpForLevel: level => {
        return Math.ceil(Math.pow((level - 1) / LEVEL_CONSTANT, 2));
    },
    xpForNextLevel: xp => {
        let nextLevel =  module.exports.levelFromXp(xp) + 1;
        return module.exports.xpForLevel(nextLevel);
    }
};
