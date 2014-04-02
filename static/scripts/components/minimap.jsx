/* -*- mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2 -*- */

define(['react', 'underscore', 'jQuery'], function(React, _, $) {
  'use strict';

  var Minimap = React.createClass({
    componentDidMount: function() {
      this.setState({panelHeight: this.getDOMNode().clientHeight});;
    },
    render: function() {
      var self = this;
      var model = this.props.model;
      var numPages = (model.get("pdf").pdfInfo && model.get("pdf").pdfInfo.numPages) || -1;
      var minimapNodes = model.get("minimap");

      var textLayersAreDone = numPages === _.filter(minimapNodes, _.isObject).length;
      // Check if we're done
      if(!textLayersAreDone) { return <div className="minimap" />; }

      // The basic idea here is using a sweepline to
      // project the 2D structure of the PDF onto a 1D minimap
      var segments = [];
      var contentHeight = 0;
      for(var i = 0; i < minimapNodes.length; i++) { // per page
        var $page = $(minimapNodes[i][0]).closest(".page");
        contentHeight = contentHeight + $page[0].clientHeight;
        var scrollTop = $page.closest(".viewer").scrollTop();
        var nodes = _.map(minimapNodes[i], function(node) {
          return {
            height: Math.floor(node.clientHeight),
            offset: Math.floor(scrollTop + $(node).offset().top),
            className: node.className
          };
        });
        var sortedByOffset = _.sortBy(nodes, function(n) { return n.offset; });
        for(var j = 0; j < sortedByOffset.length; j++) {
          var node = sortedByOffset[j];
          var prevSegment = segments.slice(-1).pop(); // peek
          if(segments.length === 0) {
            segments.push(node);
            continue;
          }
          if((prevSegment.offset + prevSegment.height) >= node.offset) {
            prevSegment = segments.pop();
            var nextHeight =  prevSegment.height +
                  ((node.height + node.offset) - (prevSegment.height + prevSegment.offset));
            var nextSegment = {
              offset: prevSegment.offset,
              height: nextHeight, // overlapping height
              className: prevSegment.className + " " + node.className
            };
            segments.push(nextSegment);
          } else {
            segments.push(node);
          }
        }
      }
      var factor = contentHeight / this.state.panelHeight;
      var segmentNodes = segments.map(function(node) {
        var style = {
          height: node.height / factor + "px",
          top: node.offset / factor + "px"
        };
        return (
            <div className={"minimap-node " + node.className}
                 style={style} />);
      });
      return(<div className="minimap">{segmentNodes}</div>);
    }
  });

  return Minimap;
});
