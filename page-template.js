var _ = require("lodash");
var path = require("path");

//LOCAL DEPENDENCIES
var getTransform = require("./get-transform");
var get = require("./get");

var defaultOpts = {
    pathName: null
};

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

class PageTemplate  {

    constructor(opts) {
        opts = _.defaults(opts, defaultOpts);
        this.baseName = _.isUndefined(opts.baseName) ? opts.key : opts.baseName; //TODO key is a legacy property
        // console.log("instantiating a page template with basename", this.baseName);
        this.data = opts.data;
        this.iterablePropName = opts.iterablePropName;
        this.iterableEndpoint = opts.iterableEndpoint;
        this.iterateAs = opts.iterateAs;

        if (opts.children) {
            this.children = _.map(opts.children, (childTemplateOpts => new this.constructor(childTemplateOpts)));
        }
    }

    compilePageTemplates(buildOpts, basePath, data){
        var self = this;

        var pageTemplateData = _.defaults({}, this.data, data);
        var promise = Promise.resolve(pageTemplateData);

        promise = promise
            .then(function(pageTemplateData){
                return getTransform("preIteratePageTemplate", buildOpts.transforms).call(self, pageTemplateData);
            });

        var entriesPromise;

        if (this.iterablePropName) {

            promise = promise
                .then(function(data){
                    var propName = self.iterablePropName;

                    if (propName in data) {
                        entriesPromise = Promise.resolve(data[propName])
                    }
                    return data;
                });

        } else if (this.iterableEndpoint) {

            promise = promise
                .then(function(data){
                    entriesPromise = get(self.iterableEndpoint);
                    return data;
                });

        }

        return promise
            .then(function(data){
                if (entriesPromise) {
                    return entriesPromise
                        .then(function(entries){

                            if (!_.isArrayLikeObject(entries)) {
                                throw {message: 'Did not get iterable data:', entries};
                            }

                            return Promise.resolve(entries)
                                .then(function(entries){
                                    return getTransform("gotPageTemplateEntries", buildOpts.transforms).call(self, entries);
                                })
                                .then(function(entries){
                                    return Promise.all(
                                        _.map(entries, function(entry, ii){
                                            var entryData = {};

                                            if (self.iterateAs) {
                                                entryData[self.iterateAs] = entry;
                                            }

                                            entryData = _.defaults(entryData, data);

                                            return self.compilePage(buildOpts, basePath, entryData, ii, entries.length);
                                        })
                                    );
                                });
                        })

                } else {
                    return self.compilePage(buildOpts, basePath, _.assign({}, data));
                }
            })
            .then(function(pages){
                if (!_.isArrayLikeObject(pages)) {
                    pages = [pages];
                }
                if (self.children) {
                    return Promise.all(
                            _.flatMap(pages, function(page) {
                                return _.flatMap(self.children, function(childPageTemplate) {
                                    return childPageTemplate.compilePageTemplates(buildOpts, page.path, page.data);
                                });
                            })
                        )
                        .then(function(allPages){
                            return pages.concat(allPages);
                        });
                }
                return pages;
            });
    }

    compilePage(buildOpts, basePath, data, entryIndex, entryTotal){
        var self = this;
        var Page = buildOpts.classes.Page;
        var pagePath = basePath.concat(this.baseName);
        return Promise.resolve({
                data: data,
                path: pagePath,
                pathName: path.posix.join.apply(this, pagePath),
                baseName: this.baseName,
                entryIndex: entryIndex,
                entryTotal: entryTotal
            })
            .then(function(pageOpts){
                return getTransform("preCompilePage", buildOpts.transforms).call(self, pageOpts);
            })
            .then(function(pageOpts){
                return new Page(pageOpts);
            })
            .then(function(page){
                return getTransform("compilePage", buildOpts.transforms).call(self, page);
            });
    }
}



module.exports = PageTemplate;
