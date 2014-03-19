'use strict';
require.config({
    urlArgs: "ts="+new Date().getTime(), // disable caching - remove in production
    baseUrl: '/static/scripts',
    paths: {
        'jQuery': ['https://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.0/jquery.min', 'vendor/jquery'],
        'underscore': ['https://cdnjs.cloudflare.com/ajax/libs/underscore.js/1.6.0/underscore-min', 'vendor/underscore'],
        'q': ['https://cdnjs.cloudflare.com/ajax/libs/q.js/1.0.0/q.min', 'vendor/q'],
        'react': ['https://cdnjs.cloudflare.com/ajax/libs/react/0.9.0/react.min', 'vendor/react'],
        'JSXTransformer': 'vendor/JSXTransformer',
        'text': "vendor/text",
        'jsx': "vendor/jsx",
        'PDFJS': 'vendor/pdf'
    },
    shim: {
        'jQuery': { exports : 'jQuery' },
        'PDFJS': { 'exports': 'PDFJS', deps: ['vendor/pdf.worker', 'vendor/ui_utils', 'vendor/text_layer_builder'] }
    }
});

require(['react', 'jsx!components/viewer'], function (React, Viewer) {
    React.renderComponent(
        Viewer({}),
        document.getElementById('viewer')
    );
});
