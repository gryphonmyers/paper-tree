var fetch = require("node-fetch");
var colors = require("colors");

var endpointCache = {};

module.exports = function(url) {
    var self = this;
    if (url in endpointCache) {
        return endpointCache[url];
    } else {
        return endpointCache[url] = fetch(url)
            .then(function(req){
                return req.json();
            })
            .then(function(entries){
                console.log("Fetched data from: ", colors.cyan(url));
                return entries;
            });
    }
};
