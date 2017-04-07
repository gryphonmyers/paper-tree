//NPM DEPENDENCIES
var _ = require("lodash");
var path = require("path");
var del = require("del");
var fs = require("mz/fs");
var colors = require("colors");
var mkdirp = require("mkdirp-then");

//LOCAL DEPENDENCIES
var getTransform = require("./get-transform");

var defaultOpts = {
    // pugOpts: {},
    basePath: "/",
    sitemapPath: "/",
    sitemapProperties: null,
    // concurrentOperationLimit: 7,
    // concurrentPageLimit: 4
    transforms: {},
    data: {},

};

var messageTemplates = {
    pageBuilt: _.template("Wrote {{filePath}}. \n{{pagesProcessed}} pages processed out of {{totalPages}}: {{overallProgress}} ({{percentBuilt}} built vs {{percentSkipped}} skipped). {{timePassed}}", {interpolate: /{{([\s\S]+?)}}/g}),
    pageSkipped: _.template("Skipped {{filePath}}. \n{{pagesProcessed}} pages processed out of {{totalPages}}: {{overallProgress}} ({{percentBuilt}} built vs {{percentSkipped}} skipped). {{timePassed}}", {interpolate: /{{([\s\S]+?)}}/g}),
    noData: _.template(colors.yellow("No content written for {{pathName}} due to no renderable content. Do you have a build plugin configured?"), {interpolate: /{{([\s\S]+?)}}/g})
}

function hashCode(str) {
    var hash = 0, i, chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i++) {
        chr   = str.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

function parseTime(timestamp) {
    var date = new Date(timestamp);

    var hours = Math.floor(timestamp / 1000 / 60 / 60);
    timestamp -= hours * 1000 * 60 * 60;

    var mins = Math.floor(timestamp / 1000 / 60);
    timestamp -= mins * 1000 * 60;

    var secs = Math.floor(timestamp / 1000);

    return hours + ':' + mins + ':' + secs;
}

class SiteTemplate  {

    constructor(opts, PageTemplate) {
        opts = _.defaults(opts || {}, defaultOpts);
        this.data = opts.data;
        this.buildStartTime = null;
        this.buildEndTime = null;

        if (opts.pageTemplates) {
            this.pageTemplates = _.map(opts.pageTemplates, (childTemplateOpts => new PageTemplate(childTemplateOpts)));
        }
    }

    build(buildOpts) {
        var self = this;

        var promise = Promise.resolve(buildOpts)
            .then(function(buildOpts){
                return getTransform("buildSiteTemplate", buildOpts.transforms).call(self, buildOpts);
            })
            .then(function(buildOpts){
                console.log("Building site into", buildOpts.basePath);
                return buildOpts;
            });

        if (buildOpts.clean && !buildOpts.skipBuild) {
            promise = promise
                .then(function(buildOpts){
                    return del(buildOpts.basePath)
                        .then(function(){
                            console.log(colors.red("Cleaned output folder."));
                            return buildOpts;
                        })
                });
        }

        this.buildStartTime = Date.now();

        return promise
            .then(function(buildOpts){
                return Promise.all(
                    _.map(self.pageTemplates, function(pageTemplate){
                        return pageTemplate.compilePageTemplates(buildOpts, ["/"], self.data);
                    })
                ).then(function(allPages){
                    return Promise.resolve(_.flattenDeep(allPages))
                        .then(function(allPages){
                            return getTransform("compiledPages", buildOpts.transforms).call(self, allPages);
                        })
                        .then(function(allPages){
                            if (buildOpts.skipBuild) {
                                return Promise.resolve(allPages)
                                    .then(function(){
                                        console.log("Skipping build. Page compile complete.");
                                    });
                            }
                            console.log("Finished preparing pages. Starting file writes now");

                            var buildPromise = Promise.resolve();
                            var hashMapPath = path.normalize(path.format({dir: buildOpts.hashMapDir, base: buildOpts.hashMapBasename}));
                            if (buildOpts.skipUnchanged) {
                                buildPromise = buildPromise
                                    .then(function(){
                                        return fs.readFile(hashMapPath)
                                            .then(function(hashMap){
                                                return JSON.parse(hashMap);
                                            }, function(){
                                                return {};
                                            });
                                    });
                            }

                            return buildPromise
                                .then(function(hashMap){
                                    var pagesBuilt = 0;
                                    var pagesSkipped = 0;
                                    if (buildOpts.skipUnchanged && !hashMap) {
                                        console.warn(colors.yellow("No valid hashMap was found, so partial build will be slower. If this is the first build, it's normal. Starting full build."))
                                    }
                                    return Promise.all(
                                            _.map(
                                                _.chunk(
                                                    allPages,
                                                    _.clamp(Math.round(allPages.length / buildOpts.numThreads), 1, 1000)
                                                ),
                                                function(chunkOfPages, ii){
                                                    return _.reduce(chunkOfPages, function(promiseChain, page){
                                                        return promiseChain
                                                            .then(function(){
                                                                var statusCode = 0;
                                                                return page.build(buildOpts)
                                                                    .then(function(contentToWrite){
                                                                        if (contentToWrite) {
                                                                            var hash = hashCode(contentToWrite);
                                                                            return page.getTransformedFilePath(buildOpts)
                                                                                .then(function(filePath){
                                                                                    return fs.open(filePath, 'r')
                                                                                        .then(function(fileDescriptor){
                                                                                            var promise = Promise.resolve();
                                                                                            if (buildOpts.skipUnchanged) {
                                                                                                if (hashMap) {
                                                                                                    promise = promise
                                                                                                        .then(function(){
                                                                                                            return fs.close(fileDescriptor);
                                                                                                        })
                                                                                                    if (hashMap[filePath] != hash) {
                                                                                                        statusCode = 1;
                                                                                                        promise = page.writeInto(buildOpts, filePath, contentToWrite);
                                                                                                    } else {
                                                                                                        statusCode = 2;
                                                                                                    }
                                                                                                } else {
                                                                                                    promise = fs.readFile(fileDescriptor, {encoding:'utf8'})
                                                                                                        .then(function(readBuffer){
                                                                                                            return fs.close(fileDescriptor)
                                                                                                                .then(function(){
                                                                                                                    if (hashCode(readBuffer) != hash) {
                                                                                                                        statusCode = 1;
                                                                                                                        return page.writeInto(buildOpts, filePath, contentToWrite);
                                                                                                                    } else {
                                                                                                                        statusCode = 2;
                                                                                                                    }
                                                                                                                });
                                                                                                        }, function(){
                                                                                                            throw err;
                                                                                                        });
                                                                                                }
                                                                                            } else {
                                                                                                statusCode = 1;
                                                                                                promise = fs.close(fileDescriptor)
                                                                                                    .then(function(){
                                                                                                        return page.writeInto(buildOpts, filePath, contentToWrite);
                                                                                                    });
                                                                                            }

                                                                                            return promise;

                                                                                        }, function(err){
                                                                                            return mkdirp(page.getDirPath(buildOpts))
                                                                                                .then(function(){
                                                                                                    statusCode = 1;
                                                                                                    return page.writeInto(buildOpts, filePath, contentToWrite);
                                                                                                });
                                                                                        })
                                                                                        .then(function(){
                                                                                            return filePath;
                                                                                        });
                                                                                })
                                                                                .then(function(filePath){
                                                                                    if (statusCode === 1 && filePath) {
                                                                                        hashMap[filePath] = hash;
                                                                                    }
                                                                                    return filePath;
                                                                                });
                                                                        }
                                                                    })
                                                                    .then(function(filePath){

                                                                        switch (statusCode) {
                                                                            case 1:
                                                                                pagesBuilt++;
                                                                                break;
                                                                            case 2:
                                                                                pagesSkipped++;
                                                                                break;
                                                                            case 0:
                                                                            default:
                                                                                break;
                                                                        }
                                                                        var locals = {
                                                                            filePath: colors.cyan(filePath),
                                                                            timePassed: colors.magenta(parseTime(Date.now() - self.buildStartTime)),
                                                                            totalPages: colors.green(allPages.length),
                                                                            pagesBuilt : colors.white(pagesBuilt),
                                                                            pagesSkipped : colors.gray(pagesSkipped),
                                                                            pagesProcessed: colors.green(pagesBuilt + pagesSkipped),
                                                                            percentBuilt : colors.white(Math.round(pagesBuilt / allPages.length * 100) + "%"),
                                                                            percentSkipped : colors.gray(Math.round(pagesSkipped / allPages.length * 100) + "%"),
                                                                            overallProgress : colors.green(Math.round((pagesBuilt + pagesSkipped) / allPages.length * 100) + "%")
                                                                        };
                                                                        switch (statusCode) {
                                                                            case 1:
                                                                                console.log(messageTemplates.pageBuilt(locals));
                                                                                break;
                                                                            case 2:console.log(messageTemplates.pageSkipped(locals));
                                                                                break;
                                                                            case 0:
                                                                            default:
                                                                                console.warn(messageTemplates.noData(locals));
                                                                                break;
                                                                        }
                                                                    });
                                                            })
                                                    }, Promise.resolve());
                                                }
                                            )
                                        )
                                        .then(function(){
                                            console.log("Writing hash map to", hashMapPath);
                                            return mkdirp(buildOpts.hashMapDir)
                                                .then(function(){
                                                    return fs.writeFile(hashMapPath, JSON.stringify(hashMap));
                                                }, function(){
                                                    return fs.writeFile(hashMapPath, JSON.stringify(hashMap));
                                                })
                                                .then(function(){
                                                    return allPages;
                                                })
                                        });
                                })
                                .then(function(allPages){
                                    self.buildStartTime = null;

                                    return getTransform("builtPages", buildOpts.transforms).call(self, allPages);
                                });
                        });
                });
            });
    }
}

module.exports = SiteTemplate;
