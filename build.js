({
    appDir: "./static",
    baseUrl: "./scripts",
    dir: "./build",
    optimize: "uglify2",
    useStrict: true,

    // call with `node r.js -o build.js`
    // add `optimize=none` to skip script optimization (useful during debugging).

    mainConfigFile: "./static/scripts/main.js",
    onBuildWrite: function (moduleName, path, singleContents) {
        return singleContents.replace(/jsx!/g, '');
    },

    optimizeCss: 'standard',

    modules: [
        {
            name: "main",
            exclude: ["jsx", "react"]
        }
    ]
})
