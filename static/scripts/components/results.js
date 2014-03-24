/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['jQuery', 'underscore', 'react'], function($, _, React) {

  var succinct = function(str, options){
    // kindly from https://github.com/micjamking/Succinct
    var defaults = {
      size: 240,
      omission: '…',
      ignore: true
    };
    options = $.extend(defaults, options);

    var textDefault,
        textTruncated,
        regex = /[!-\/:-@\[-`{-~]$/;

    textDefault = str;

    if (textDefault.length > options.size) {
      textTruncated = $.trim(textDefault).
        substring(0, options.size).
        split(' ').
        slice(0, -1).
        join(' ');

      if (options.ignore) {
        textTruncated = textTruncated.replace( regex , '' );
      }
      return textTruncated + options.omission;
    }
    return textDefault;
  };

  var Block = React.createClass({
    levels: ['negative', 'unknown', 'positive'],
    toggleActivate: function(e) {
      var clicked = this.props.result.name;
      var result = window.appState.results.result.find(function(el) {
        return el.name.val() == clicked;
      });
      var isActive = !result.active.val();
      result.add("active", isActive);
    },
    render: function() {
      var result = this.props.result;
      var annotations = result.annotations.map(function(annotation) {
        return (<li>{succinct(annotation.sentence, 180)}</li>);
      });
      return(<div className="block">
               <h4><a onClick={this.toggleActivate} className={result.active ? result.id + "_header" : ""}>{result.name}</a></h4>
               <div className="content">
                 <div className="document">
                   <span className="head">overall assesment: </span>{this.levels[result.document + 1]}
                 </div>
                 <ul>{annotations}</ul>
               </div>
             </div>);
    }
  });

  var Results = React.createClass({
    render: function() {
      var results = window.appState.results.getValue().result;
      var self = this;
      var blocks = results && results.map(function(result, idx) {
        var key = results.id + result.id;
        return (<Block key={key} result={result} />);
      });
      return(
          <div>
            {blocks}
          </div>);
    }
  });

  return Results;
});
