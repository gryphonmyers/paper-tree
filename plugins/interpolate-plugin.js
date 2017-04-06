var _ = require("lodash");

var defaultBuildOpts = {
};

module.exports = function(){
    return {
        name:"interpolate-static-plugin",
        version: "0.1.0",
        requires: {},
        transforms: {
            preIteratePageTemplate: function(data){
                this.pathName = _.template(this.pathName)(data);
                if ('iterablePropName' in this) {
                    this.iterablePropName = _.template(this.iterablePropName)(data);
                }
                if ('iterableEndpoint' in this) {
                    this.iterableEndpoint = _.template(this.iterableEndpoint)(data);
                }
                return data;
            },
            compilePage: function(page){
                page.path = _.map(page.path, (pathSegment => _.template(pathSegment)(page.data)));
                page.pathName = _.template(page.pathName)(page.data);
                page.baseName = _.template(page.baseName)(page.data);
                return page;
            },
            filePath: function(filePath){
                filePath = _.template(filePath)(this.data);
                return filePath;
            }
        }
    };
};
