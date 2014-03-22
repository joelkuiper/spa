/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['underscore', 'react'], function(_, React) {
  var Block = React.createClass({
    render: function() {
      var result = this.props.result;
      var annotations = _.map(result.annotations, function(annotation) {
        return (<li>{annotation.sentence}</li>);
      });
      return(<div className="block">
               <h4><a>{result.name}</a></h4>
               <div className="content">
                 <div className="document"><span>Overall Assesment</span> {result.document}</div>
                 <ul>{annotations}</ul>
               </div>
             </div>);
    }
  });

  var Results = React.createClass({
    render: function() {
      var results = this.props.appState.results.getValue().result;
      var blocks = _.map(results, function(result) {
        return (<Block result={result} />);
      });
      return(
          <div id="sidebar">
            {blocks}
          </div>);
    }
  });

  return Results;
});
