/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['jQuery', 'underscore', 'Q'], function($, _, Q) {

  var Annotator = {

    annotate: function(document) {
      var deferred = Q.defer();
      var contents = _.pluck(document.pages, "content");
      $.ajax({
        url: '/annotate',
        type: 'POST',
        data: JSON.stringify({pages: contents}),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        async: true,
        success: function(result) {
          console.log(result);
          return deferred.resolve(result);
        }
      });
      return deferred;
    }
  };

  return Annotator;
});
