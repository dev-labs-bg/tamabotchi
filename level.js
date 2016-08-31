//lvl = Math.floor(LEVEL_CONSTANT * sqrt(totalXP)) + 1;
const LEVEL_CONSTANT = 0.1

module.exports = {
    level_from_xp: xp => {
        console.log('level.level_from_xp');
        return Math.floor(LEVEL_CONSTANT * Math.sqrt(xp)) + 1;
    },
    xp_for_next_level: xp => {
        let nextLevel = module.exports.level_from_xp(xp);
        return Math.ceil(Math.pow(nextLevel / LEVEL_CONSTANT, 2));
    }
};
