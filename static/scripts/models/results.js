/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2; -*- */
define(['backbone', 'helpers/annotator'], function(Backbone, Annotator) {
  'use strict';

  var Result = Backbone.Model.extend({
    defaults: {
      id: "",
      document: null,
      name: "",
      active: false,
      annotations: []
    }
  });

  var Results = Backbone.Collection.extend({
    model: Result,
    fetch: function(document) {
      var self = this;
      Annotator.annotate(document)
        .then(function(results) {
          self.reset(results);
        });
    }
  });

  return Results;
});
