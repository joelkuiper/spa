/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2; -*- */
'use strict';

require.config({
  baseUrl: '/static/scripts',
  jsx: {
    fileExtension: '.jsx'
  },
  paths: {
    'jQuery': 'vendor/jquery',
    'jQuery.injectCSS': 'vendor/jquery.injectCSS',
    'underscore': 'vendor/underscore',
    'Q': 'vendor/q',
    'react': 'vendor/react',
    'JSXTransformer': 'vendor/JSXTransformer',
    'backbone': 'vendor/backbone',
    'PDFJS': 'vendor/pdfjs/pdf'
  },
  shim: {
    'jQuery': { exports : 'jQuery' },
    'underscore': { exports : '_' },
    'jQuery.injectCSS': { deps: ['jQuery'] },
    "backbone": {
      deps: ["jQuery", "underscore"],
      exports: "Backbone" },
    'PDFJS': {
      exports: 'PDFJS',
      deps: ['vendor/pdfjs/compatibility', 'vendor/pdfjs/ui_utils', 'helpers/text_layer_builder'] }
  }
});

define(function (require) {
  var React = require("react");
  var AppState = require("models/appState");
  var ResultsState = require("models/results");

  var appState = new AppState();
  var resultsState = new ResultsState();

  var FileLoader = require("jsx!components/fileLoader");
  React.renderComponent(
    FileLoader({model: appState, mimeType: /application\/(x-)?pdf|text\/pdf/}),
    document.getElementById("file-loader")
  );

  var Viewer = require("jsx!components/viewer");
  var viewer = React.renderComponent(
    Viewer({pdf: {}, results: resultsState, appState: appState }),
    document.getElementById("viewer")
  );

  appState.on("change:pdf", function(e, pdf) {
    viewer.setProps({pdf: pdf});
  });

  var Results = require("jsx!components/results");
  var results = React.renderComponent(
    Results({results: resultsState}),
    document.getElementById("results")
  );

  resultsState.on("all", function(e, obj) {
    viewer.forceUpdate();
    results.forceUpdate();
  });

  var Minimap = require("jsx!components/minimap");
  var minimap = React.renderComponent(
    Minimap({model: appState, id: "viewer"}),
    document.getElementById("minimap")
  );

  appState.on("update:minimap", function(e) {
    minimap.forceUpdate();
  });



});
