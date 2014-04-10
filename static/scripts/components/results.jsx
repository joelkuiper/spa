/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2 -*- */
define(['jQuery', 'underscore', 'react'], function($, _, React) {
  'use strict';

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
      var result = this.props.result;
      var isActive = !result.get("active");
      result.set({"active": isActive});
    },
    render: function() {
      var result = this.props.result;
      var annotations = result.get("annotations").map(function(annotation, idx) {
        if(annotation.sentence) {
          return (<li key={idx}>{succinct(annotation.sentence, 180)}</li>);
        } else {
          return "";
        }
      });

      var overall = "";
      var document = result.get("document");
      if(!_.isNull(document)) {
        overall =
          <span><span className="head">overall assesment: </span>{this.levels[document + 1]}</span>;
      }

      return(<div className="block">
               <h4>
                 <a onClick={this.toggleActivate} className={result.get("active") ? result.id + "_header" : ""}>
                   {result.get("name")}
                 </a>
               </h4>
               <div className="content">
                 <div className="document">
                   {overall}
                 </div>
                 <ul>{annotations}</ul>
               </div>
             </div>);
    }
  });

  var Results = React.createClass({
    render: function() {
      var results = this.props.results;
      var self = this;
      var blocks = results && results.map(function(result, idx) {
        return (<Block key={result.id} result={result} />);
      });
      return(<div>{blocks}</div>);
    }
  });

  return Results;
});
