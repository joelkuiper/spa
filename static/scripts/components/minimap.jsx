/* -*- mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2 -*- */

define(['react', 'underscore', 'jQuery'], function(React, _, $) {
  'use strict';
  var VisibleArea = React.createClass({
    getInitialState: function() {
      return {
        mouseDown: false,
        offset: $(this.props.target).scrollTop() / this.props.factor
      };
    },
    componentWillUnmount: function() {
      $(this.props.target).off("scroll");
      $(this.getDOMNode().parentNode).off("mouseup mousedown mousemove");
    },
    componentDidMount: function() {
      var self = this;
      var $target =  $(this.props.target);
      var scrollTo = function(e, offset) {
        var y = e.pageY;
        var scroll = (y - offset) * self.props.factor;
        $target.scrollTop(scroll);
      };
      $target.on("scroll", function() {
        self.setState({offset: $target.scrollTop() / self.props.factor});
      });
      // FIXME THIS SHOULD NOT BE DONE HERE
      $(this.getDOMNode().parentNode)
        .on("mouseup", function(e) {
          self.setState({mouseDown: false});
        })
        .on("mousemove", function(e) {
          if(self.state.mouseDown) {
            console.log("mouseMove");
            var offset =  e.pageY - $(self.getDOMNode()).position().top;
            self.setState({offset: e.pageY - (self.props.height / 2) });
            scrollTo(e, offset);
          }
        })
        .on("mousedown", function(e) {
          self.setState({mouseDown: true});
          var y = e.pageY;

          if (e.target !== self.getDOMNode()) {
            // Jump to mousedown position
            var offset = (self.props.height / 2);
            self.setState({offset: e.pageY - offset});
            scrollTo(e, offset);
          }
          return false;

        });
    },
    render: function() {
      var style = { height: this.props.height,
                    top: this.state.offset };
      return(<div className="visible-area" style={style}></div>);
    }
  });

  var Minimap = React.createClass({
    componentDidMount: function() {
      this.setState({panelHeight: this.getDOMNode().clientHeight});;
    },
    projectTextNodes: function(textNodes, factor) {
      // The basic idea here is using a sweepline to
      // project the 2D structure of the PDF onto a 1D minimap
      var segments = [];
      var nodes = _.map(textNodes, function(node) {
        return {
          height: node.clientHeight / factor,
          position: $(node).position().top / factor,
          className: node.className
        };
      });
      var sortedByPosition = _.sortBy(nodes, function(n) { return n.position; });
      for(var i = 0; i < sortedByPosition.length; i++) {
        var node = sortedByPosition[i];
        var prevSegment = segments.slice(-1).pop(); // peek
        if(segments.length === 0) {
          segments.push(node);
          continue;
        }

        if((prevSegment.position + prevSegment.height) >= node.position) {
          prevSegment = segments.pop();
          var nextHeight =  prevSegment.height +
                ((node.height + node.position) - (prevSegment.height + prevSegment.position));
          var nextSegment = {
            position: prevSegment.position,
            height: nextHeight, // overlapping height
            className: prevSegment.className + " " + node.className
          };
          segments.push(nextSegment);
        } else {
          segments.push(node);
        }
      }
      return segments;
    },
    render: function() {
      var self = this;
      var model = this.props.model;
      var pdfInfo = model.get("pdf").pdfInfo;
      if(!pdfInfo)  { return <div className="minimap" />; }

      var fingerprint = pdfInfo.fingerprint;
      var numPages =  pdfInfo.numPages;
      var nodesPerPage = model.get("minimap");

      var textLayersAreDone = numPages === _.filter(nodesPerPage, _.isObject).length;
      // Check if we're done
      if(!textLayersAreDone) { return <div className="minimap" />; }

      var pages = [];
      for(var i = 0; i < nodesPerPage.length; i++) {
        var textNodes = nodesPerPage[i];
        var $firstNode = $(textNodes[0]);
        var $page = $firstNode.closest(".page");
        pages.push({
          height: $page.height(),
          offset: $page.offset(),
          textNodes: textNodes
        });
      }
      var totalHeight = _.reduce(pages, function(mem, el) { return el.height + mem; }, 0);
      var factor = totalHeight / this.state.panelHeight;

      var pageElements = pages.map(function(page, idx) {
        var style = { height: page.height / factor};
        var textNodes = self.projectTextNodes(page.textNodes, factor);
        var textSegments = textNodes.map(function(segment, idx) {
          var style = {
            "top": Math.floor(segment.position) + "px",
            "height": Math.floor(segment.height) + "px"
          };
          return(<div key={idx} className={"text-segment " + segment.className} style={style} />);
        });
        var key = fingerprint + idx;
        return <div className="minimap-node" key={key} style={style}>{textSegments}</div>;
      });

      return(<div className="minimap">
             <VisibleArea height={this.state.panelHeight / factor} target={this.props.target} factor={factor} />
             {pageElements}
             </div>);
    }
  });

  return Minimap;
});
