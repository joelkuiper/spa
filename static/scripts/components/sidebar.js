/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['react'], function(React) {
  var Sidebar = React.createClass({
    render: function() {
      return(
          <div id="sidebar">
            <h3>Results</h3>
            <pre>{JSON.stringify(this.props.appState.results.getValue(), undefined, 2)}</pre>
          </div>);
    }
  });

  return Sidebar;
});
