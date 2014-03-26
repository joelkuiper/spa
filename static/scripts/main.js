/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2; -*- */

'use strict';
require.config({
  baseUrl: '/static/scripts',
  paths: {
    'jQuery': 'vendor/jquery',
    'jQuery.injectCSS': 'vendor/jquery.injectCSS',
    'underscore': 'vendor/underscore',
    'Q': 'vendor/q',
    'react': 'vendor/react',
    'JSXTransformer': 'vendor/JSXTransformer',
    'cortex': 'vendor/cortex',
    'PDFJS': 'vendor/pdfjs/pdf'
  },
  shim: {
    'cortex': { exports: 'Cortex' },
    'jQuery': { exports : 'jQuery' },
    'jQuery.injectCSS': { deps: ['jQuery'] },
    'PDFJS': { 'exports': 'PDFJS', deps: ['vendor/pdfjs/compatibility', 'vendor/pdfjs/ui_utils', 'helpers/text_layer_builder'] }
  }
});

require(['react', 'cortex', 'jsx!components/app'], function (React, Cortex, App) {
  var appComponent,
      appData = {results: {}};
  window.appState = new Cortex(appData, function(updatedApp) {
    appComponent.setProps({});
  });

  appComponent = React.renderComponent(
    App(),
    document.getElementById('app')
  );
});
