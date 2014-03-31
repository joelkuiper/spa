({
    appDir: "./scripts",
    baseUrl: "./",
    dir: "./build",
    optimize: "uglify2",

    // call with `node r.js -o build.js`
    // add `optimize=none` to skip script optimization (useful during debugging).

    mainConfigFile: "./scripts/main.js",
    onBuildWrite: function (moduleName, path, singleContents) {
        return singleContents.replace(/jsx!/g, '');
    },

    modules: [
        {
            name: "main",
            exclude: ["jsx", "PDFJS"]
        }
    ]
})
