/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['jQuery', 'underscore', 'Q'], function($, _, Q) {

  function randomId(size, prefix) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < size; i++ ) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return prefix ? prefix + text : text;
  }

  var Annotator = {
    annotate: _.memoize(function(document) {
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
          result.id = randomId(8);
          deferred.resolve(result);
        }
      });
      return deferred.promise;
    }, function(document) {
      return document.info.fingerprint;
    })
  };

  return Annotator;
});
