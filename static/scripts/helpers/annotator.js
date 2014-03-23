/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['jQuery','underscore', 'Q', 'jQuery.injectCSS'], function($, _, Q) {

  var colors =
        [[27,158,119],
         [217,95,2],
         [117,112,179],
         [231,41,138],
         [102,166,30],
         [230,171,2],
         [166,118,29],
         [27,158,119],
         [217,95,2],
         [117,112,179],
         [231,41,138],
         [102,166,30],
         [230,171,2],
         [166,118,29],
         [102,102,102]];

  function randomId(size, prefix) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for(var i = 0; i < size; i++ ) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return prefix ? prefix + text : text;
  }

  function toClassName(str) {
    return str ? str.replace(/ /g, "-").toLowerCase() : null;
  };

  function injectStyles(id, color) {
    var styles = {};
    var colorStr = color.join(",");
    styles["." + id + "_header"] = {
      "background-color": "rgb(" + colorStr + ") !important",
      "color": "white !important"
    };
    styles["." + id + "_annotation"] = {
      "border-bottom" : "1px solid rgb(" + colorStr + ")",
      "background-color": "rgba(" + colorStr + ", 0.1)"
    };
    $.injectCSS(styles);
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
        success: function(data) {
          data.id = randomId(8);
          _.each(data.result, function(result, idx) {
            var id = toClassName(result.name);
            result.active = true;
            result.id = id;
            injectStyles(id, colors[idx % colors.length]);
          });
          deferred.resolve(data);
        }
      });
      return deferred.promise;
    }, function(document) {
      return document.info.fingerprint;
    })
  };

  return Annotator;
});
