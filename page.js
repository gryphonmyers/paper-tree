//NPM DEPENDENCIES
var path = require("path");
var fs = require("mz/fs");
var mkdirp = require("mkdirp-promise/lib/node4");

//LOCAL DEPENDENCIES
var getTransform = require("./get-transform");

class Page {

    constructor(opts) {
        this.data = opts.data;
        this.path = opts.path;
        this.pathName = opts.pathName;
        this.baseName = opts.baseName;
        this.entryIndex = opts.entryIndex;
        this.entryTotal = opts.entryTotal;
    }

    build(buildOpts) {
        var self = this;
        return Promise.resolve("")
            .then(function(buildBuffer){
                return getTransform("pageContent", buildOpts.transforms).call(self, buildBuffer);
            });
    }

    getDirPath(buildOpts) {
        return path.normalize(path.join(buildOpts.basePath, this.pathName));
    }

    getTransformedFilePath(buildOpts) {
        var self = this;
        return Promise.resolve(this.getDirPath(buildOpts))
            .then(function(dirPath){
                return getTransform("filePath", buildOpts.transforms).call(self, dirPath);
            });
    }

    writeInto(buildOpts, filePath, pageContent) {
        return fs.writeFile(filePath, pageContent)
            .then(function(){
                return filePath;
            }, function(err){
                throw err;
            });
    }

    write(buildOpts, pageContent) {
        var self = this;
        var dirPath = this.getDirPath(buildOpts);
        return mkdirp(dirPath)
            .then(function(){
                return self.getTransformedFilePath(buildOpts)
                    .then(function(filePath){
                        return writeInto(buildOpts, filePath, pageContent);
                    });
            });
    }
}

module.exports = Page;
