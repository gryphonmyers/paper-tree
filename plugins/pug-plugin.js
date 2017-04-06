var pug = require("pug");
var _ = require("lodash");
var fs = require("mz/fs");
var path = require("path");

var defaultSiteTemplateOpts = {
    baseTemplatePath: "./source/templates",
    pugOpts: {
        pretty: false
    },
};

var defaultPageOpts = {};

var defaultPageTemplateOpts = {
    templatePath: ""
};

var compiledTemplates = {};

module.exports = function(){
    return {
        name:"pug-static-plugin",
        version: "0.1.0",
        requires: {},
        classMixins: {
            Page: (PageTemplate) => class extends PageTemplate {
                constructor(opts) {
                    opts = _.defaults(opts, defaultPageOpts);
                    super(opts);
                    this.templatePath = opts.templatePath;
                }
            },
            PageTemplate: (PageTemplate) => class extends PageTemplate {
                constructor(opts) {
                    opts = _.defaults(opts, defaultPageTemplateOpts);
                    super(opts);
                    this.templatePath = opts.templatePath;
                }
            },
            SiteTemplate: (SiteTemplate) => class extends SiteTemplate {
                constructor(opts, PageTemplate) {
                    opts = _.defaults(opts, defaultSiteTemplateOpts);
                    super(opts, PageTemplate);
                    this.baseTemplatePath = opts.baseTemplatePath;
                }
            }
        },
        transforms: {
            preCompilePage: function(pageOpts){
                pageOpts.templatePath = this.templatePath;
                return pageOpts
            },

            compiledPages: function(pages){
                _.forEach(pages, (page => page.templatePath = path.join(this.baseTemplatePath, page.templatePath)));
                return pages;
            },

            filePath: function(filePath){
                return path.format({dir: filePath, base: 'index.html'});
            },

            pageContent: function(pageContent){
                var self = this;
                var locals = _.assign({page: this}, this.data);
                var templateFilePath = this.templatePath + ".pug";
                if (!(templateFilePath in compiledTemplates)) {
                    compiledTemplates[templateFilePath] = fs.readFile(templateFilePath, {encoding:'utf8'})
                        .then(function(contents){
                            return pug.compile(contents, {filename: templateFilePath});
                        });
                }

                return compiledTemplates[templateFilePath]
                    .then(function(templateFunc){
                        return templateFunc(locals);
                    });
            }
        }
    };
};
