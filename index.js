//NPM DEPENDENCIES
var _ = require("lodash");

//PLUGINS
var pugPlugin = require("./plugins/pug-plugin");
var interpolatePlugin = require("./plugins/interpolate-plugin");
var siteMapPlugin = require("./plugins/sitemap-plugin");

//LOCAL DEPENDENCIES
var SiteTemplate = require("./site-template");
var PageTemplate = require("./page-template");
var Page = require("./page");
var get = require("./get");

var defaultOpts = {
    sitemapPath: "/",
    sitemapProperties: null,
    numThreads: 100,
    transforms: {},
    plugins: [pugPlugin(), interpolatePlugin(), siteMapPlugin()],
    clean: true,
    skipBuild: false,
    basePath: "/public_html",
    skipUnchanged: true,
    hashMapDir: "public_html/",
    hashMapBasename: "staticmeta.json",
    classes: {Page,SiteTemplate,PageTemplate}
};

function buildSite(siteBlueprint, opts){

    opts = _.defaults(opts, defaultOpts);

    if (opts.plugins) {
        _.forEach(opts.plugins, function(currPlugin){
            if (currPlugin.transforms) {
                _.transform(currPlugin.transforms, function(transformObj, transformFunc, transformName){
                    if (transformName in transformObj) {
                        var origTransform = transformObj[transformName];

                        transformObj[transformName] = function(transformVal){
                            var self = this;
                            return Promise.resolve(transformVal)
                                .then(function(transformVal){
                                    return origTransform.call(self, transformVal)
                                })
                                .then(function(transformVal){
                                    return transformFunc.call(self, transformVal)
                                });
                        }
                    } else {
                        transformObj[transformName] = transformFunc;
                    }
                }, opts.transforms);
            }

            if (currPlugin.classMixins) {
                _.forEach(currPlugin.classMixins, function(classMixin, className){
                    if (className in opts.classes) {
                        var SuperClass = opts.classes[className];
                        opts.classes[className] = classMixin(SuperClass);
                    }
                });
            }
        });
    }
    var site = new opts.classes.SiteTemplate(siteBlueprint, opts.classes.PageTemplate);
    return site.build(opts);
}

buildSite.get = get;

module.exports = buildSite;
