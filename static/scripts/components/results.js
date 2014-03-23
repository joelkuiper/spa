/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['underscore', 'react'], function(_, React) {

  var Block = React.createClass({
    toggleActivate: function(e) {
      var clicked = this.props.result.name;
      var result = this.props.appState.results.result.find(function(el) {
        return el.name.val() == clicked;
      });
      var isActive = !result.active.val();
      result.add("active", isActive);
    },
    render: function() {
      var result = this.props.result;
      var annotations = result.annotations.map(function(annotation) {
        return (<li>{annotation.sentence}</li>);
      });
      return(<div className="block">
               <h4><a onClick={this.toggleActivate} className={result.active ? result.id + "_header" : ""}>{result.name}</a></h4>
               <div className="content">
                 <div className="document"><span className="head">overall assesment: </span>{result.document}</div>
                 <ul>{annotations}</ul>
               </div>
             </div>);
    }
  });

  var Results = React.createClass({
    render: function() {
      var results = this.props.appState.results.getValue().result;
      var self = this;
      var blocks = results && results.map(function(result, idx) {
        return (<Block result={result} appState={self.props.appState} />);
      });
      return(
          <div id="sidebar">
            {blocks}
          </div>);
    }
  });

  return Results;
});
