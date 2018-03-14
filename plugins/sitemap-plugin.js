var _ = require("lodash");
var mkdirp = require("mkdirp-then");
var path = require("path");
var fs = require("mz/fs");
var colors = require("colors");
var getTransform = require("../get-transform");
const json = require('big-json');
var defaultOpts = {
    siteMapPath: 'public_html',
    siteMapFileName: 'sitemap.json'
};

module.exports = function(opts){
    opts = _.defaults(opts, defaultOpts);
    return {
        name:"sitemap-static-plugin",
        version: "0.1.0",
        requires: {},
        classMixins: {
        },
        transforms: {
            buildSiteTemplate: function(buildOpts){
                this.buildOpts = buildOpts;
                return buildOpts;
            },

            compiledPages: function(pages){
                var self = this;

                var siteMap = _.transform(pages, function(siteMapNodes, page){
                    var pathSegments = page.path;

                    _.forEach(pathSegments, function(pathSegment, ii){
                        pathSegment = _.template(pathSegment)(page.data);

                        var nodeMatch =_.find(siteMapNodes, function(node){
                            return node.baseName == pathSegment;
                        });

                        if (!nodeMatch) {
                            if (ii == pathSegments.length - 1) {
                                nodeMatch = _.clone(page);
                            } else {
                                nodeMatch = {baseName: pathSegment, children:[]};
                            }
                            siteMapNodes.push(nodeMatch);
                        } else {
                            if (ii == pathSegments.length - 1) {
                                _.assign(nodeMatch, page);
                            }
                        }
                        if (!nodeMatch.children) {
                            nodeMatch.children = [];
                        }
                        siteMapNodes = nodeMatch.children;
                    });
                }, [{baseName: "/"}]);

                return mkdirp(opts.siteMapPath)
                    .then(function(){
                        return getTransform("siteMap", self.buildOpts.transforms).call(self, siteMap);
                    })
                    .then(function(siteMap){
                        const stringifyStream = json.createStringifyStream({
                            body: siteMap
                        });
                        var promise = new Promise(function(resolve){
                            var siteMapPath = path.format({dir:opts.siteMapPath, base: opts.siteMapFileName});
                            console.log("Writing JSON sitemap to", siteMapPath);
                            var writer = fs.createWriteStream(siteMapPath);

                            stringifyStream.pipe(writer);

                            stringifyStream.on('end', function(){
                                writer.end();
                                resolve();
                                console.log("Done writing JSON string");
                            })
                        });
                        
                        return promise;
                    })
                    .then(function(){
                        console.log("Wrote sitemap");
                        return pages;
                    });
            }
        }
    };
};
