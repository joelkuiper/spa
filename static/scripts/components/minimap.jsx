/* -*- mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2 -*- */

define(['react', 'underscore', 'jQuery'], function(React, _, $) {
  'use strict';

  var Minimap = React.createClass({
    render: function() {
      var state = this.props.state;
      var numPages = (state.get("pdf").pdfInfo && state.get("pdf").pdfInfo.numPages) || -1;

      if(numPages == state.get("minimap").length) {
        return(<div className="minimap" />);
      } else {
        return(<div />);
      }
    }
  });

  return Minimap;
});
