/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2; -*- */
'use strict';

define(['backbone', 'helpers/annotator'], function(Backbone, Annotator) {
  var Result = Backbone.Model.extend({
    defaults: {
      id: "",
      document: 0,
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
