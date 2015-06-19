var config = require("./config"),
    // traverse the file system;
    file = require("file"),
    // read the contents of the readme.md file;
    fs   = require("fs");

// return module content to pass into the Jade compiler;
module.exports = function () {
        // create an object to return;
    var json = {
            "pages": [],
            "modules": []
        },
        // define the locations where we'll look for pages and modules;
        folders = [
            config.src + "/modules/",
            config.src + "/pages/"
        ],
        // get a files extension, used in determining what to do with the file;
        getExtension = function (filename) {
            return filename.split(".").pop();
        },
        // rename file;
        renameFile = function (file, folder, prefix) {
            var newFilename = "",
                folderArray  = folder.split("/");
            
            // myFolder/myPage/page.jade                 --> page-myFolder-myPage.html
            // myFolder/myPage/_helper.jade              --> _helper.jade
            // myFolder/myModule/module.jade             --> module-myFolder-myModule.html
            // myFolder/myModule/your_module/module.jade --> module-myFolder-myModule-your-module.html
            
            // if a file has an underscore, don't manipulate it, just output the filename;
            if (file.indexOf("_") === 0) {
                newFilename = file;
            } else {
                // bulid a filename based on the parent folder structure;
                folderArray.map(function (folder) {
                    newFilename = (newFilename === "") ? folder : newFilename + "-" + folder;
                });
                
                // remove the parent folder;
                newFilename = newFilename.replace(config.src + "-", "");
                // remove instances of demo, module, and page;
                newFilename = newFilename + file.replace("demo", "").replace(prefix, "");
                // change it from a jade to html page;
                newFilename = newFilename.replace(".jade", ".html");
                // change pages- and modules- (built from folder structure) to page- and module-
                newFilename = newFilename.replace(prefix + "s", prefix);
                // replace all underscores with dashes;
                newFilename = newFilename.replace("_", "-", /g/);
            }
            
            return newFilename;
        },
        // for each folder we encounter...
        parseFolder = function (folder, dirs, files) {
            // for each folder, this is the data we store about it;
            var item = {
                    // array of each file type for this folder (page or module);
                    "json": [],
                    "jade": [],
                    "js":   [],
                    "scss": [],
                    "md":   [],
                    "jadeArray": [],     // temp storage of all Jade files, but there's only one "page" per entry;
                    "html":   "[empty]", // html page to load in the iframe;
                    "folder": "[empty]", // folder + filename (in the arrays above) generate a path to all files;
                    "title":  "[empty]"  // used in the SELECT for pages/modules;
                };
            
            // remove the src folder from the path;
            // we want to load doc file, not src files in the documentation app; 
            item.folder = folder.replace(config.src + "/", "");
            
            // if we're not in the documentation folder;
            // and if we have files, loop through them;
            (folder.indexOf("_docs") === -1) && (files.length) && files.forEach(function (file, index) {
                var extension = getExtension(file),
                    readme,
                    newFilename,
                    pageOrModule;
                
                // if this extension is of a file to store;
                // we don't care about EVERY file, only every file we care about;
                if (item.hasOwnProperty(extension)) {
                    // if this file is the readme;
                    if (file === "readme.md") {
                        // grab the first line (the title);
                        readme = fs.readFileSync(folder + "/" + file).toString().split("\n");
                        // so we can save it for our modules / pages object;
                        item.title = readme[0].replace("# ", "");
                    }
                    // no need to document the documentation;
                    if (file.indexOf("demo") !== 0) {
                        // save this file;
                        item[extension].push(file);
                        
                        // if this is a jade file, we want to track it because of the filename;
                        // we use the jade filename to generate an HTML filename (to show in the IFRAME);
                        if (extension === "jade") {
                            // are we working with a page or a module;
                            pageOrModule = (file.indexOf("page") === 0) ? "page" : "module";
                            
                            // rename the file;
                            newFilename = renameFile(file, folder, pageOrModule);
                            
                            // store each jade page here, we'll filter them later;
                            item.jadeArray.push(newFilename);
                        }
                    }
                }
            });
            
            // after recording all pertinent information about this module/page, save it;
            // but let's manipulate it first;
            // each jade entry equals one page entry (unless that jade file has an _ in it);
            item.jade.map(function (newItem, index) {
                // make a copy of the object so we can manipulate it and still loop through the original content;
                var itemClone = JSON.parse(JSON.stringify(item));
                
                // since we're creating one entry per HTML page;
                // set the page title of this one to that index (this one is 1, next one is 2, etc.);
                itemClone.html = itemClone.jadeArray[index];
                
                // don't pass this array down to the browser (we don't need it anymore);
                delete itemClone.jadeArray;
                
                // don't create a "page" entry for an include (defined by an _);
                // it's already present in the object, so we can view it's contents via the file SELECT;
                // but there's no page to view for it;
                if (itemClone.html.indexOf("_") === -1) {
                    // if this is a page object;
                    if (folder.indexOf("pages/") > -1) {
                        json.pages.push(itemClone);
                    // otherwise it's a modules object;
                    } else {
                        json.modules.push(itemClone);
                    }
                }
            });
        };
    
    // go through the file system, grab all files and put them into the "json" object;
    folders.map(function (folder) {
        file.walkSync(folder, parseFolder);
    });
    
    return json;
};
