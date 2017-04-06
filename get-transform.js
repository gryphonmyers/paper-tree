module.exports = function(transformName, transformsObj) {
    if (transformName in transformsObj) {
        return transformsObj[transformName];
    }
    return (val => val);
};
