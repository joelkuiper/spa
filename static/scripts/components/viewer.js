/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['react', 'underscore','Q', 'jQuery', 'helpers/annotator'], function(React, _, Q, $, Annotator) {
  var TextLayer = React.createClass({
    getNodeAnnotations: _.memoize(function(results, pageIndex, key) {
      var ids = _.pluck(results.result, "id");
      var annotations = _.pluck(results.result, "annotations");
      var nodesForPage = _.map(annotations, function(d) {
        return _.flatten(_.pluck(_.filter(d, function(dd) { return dd.page == pageIndex; }), "nodes"));
      });
      return _.object(ids, nodesForPage);
    }, function(results, pageIndex, key) { // hashFunction
      return pageIndex + key + results.id;
    }),
    render: function() {
      var results = window.appState.results.getValue();
      var pageIndex = this.props.pageIndex;
      var key = this.props.key;
      var annotations = this.getNodeAnnotations(results, pageIndex, key);

      var cx = React.addons.classSet;
      var textNodes = this.props.content.map(function (o,i) {
        if(o.isWhitespace) { return null; }
        var classes = _.filter(_.map(_.pairs(annotations), function(a) {
          return  _.contains(a[1], i) ? a[0] : null; }), _.isString);

        var activeClasses = _.object(_.map(classes, function(c) {
          var result = window.appState.results.result.find(function(el) {
            return el.id.val() == c;
          });
          return [c + "_annotation", result.active.val()];
        }));

        if(activeClasses.length > 0) {
          activeClasses.annotated = true;
        }

        return (
            <div style={o.style}
                 dir={o.dir}
                 key={key + i}
                 className={cx(activeClasses)}
                 data-angle={o.angle}
                 data-canvas-width={o.canvasWidth}
                 data-font-name={o.fontName}>
            {o.textContent}
          </div>
        );
      });
      return <div className="textLayer">{textNodes}</div>;
    }
  });

  var Page = React.createClass({
    renderPage: function(pageObj) {

      var self = this;
      var page = pageObj.raw;
      var content = pageObj.content;

      var canvas = this.refs.canvas.getDOMNode();
      var container = this.refs.container.getDOMNode();
      var textLayerDiv = this.refs.textLayer.getDOMNode();
      var context = canvas.getContext("2d");

      var SCROLLBAR_PADDING = 0;
      var viewport = page.getViewport(1.0);

      var pageWidthScale = (container.clientWidth - SCROLLBAR_PADDING) / viewport.width;
      viewport = page.getViewport(pageWidthScale);

      //Checks scaling on the context if we are on a HiDPI display
      var outputScale = getOutputScale(context);
      context._scaleX = outputScale.sx;
      context._scaleY = outputScale.sy;

      if (outputScale.scaled) {
        // scale up canvas (since the -transform reduces overall dimensions and not just the contents)
        canvas.height = viewport.height * outputScale.sy;
        canvas.width = viewport.width * outputScale.sx;
        var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' + (1 / outputScale.sy) + ')';
        CustomStyle.setProp('transform', canvas, cssScale);
        CustomStyle.setProp('transformOrigin', canvas, '0% 0%');

        context.scale(outputScale.sx, outputScale.sy);

        // textLayerDiv
        CustomStyle.setProp('transform', textLayerDiv, cssScale);
        CustomStyle.setProp('transformOrigin', textLayerDiv, '0% 0%');
      } else {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
      }

      var containerOffset = $(container).offset();
      $(textLayerDiv)
        .css("height", canvas.height + "px")
        .css("width", canvas.width + "px")
        .offset({top: containerOffset.top, left: containerOffset.left});

      var textLayerBuilder = new TextLayerBuilder();

      textLayerBuilder.setTextContent(content);

      var renderContext = {
        canvasContext: context,
        viewport: viewport,
        textLayer: textLayerBuilder
      };

      // from http://stackoverflow.com/questions/12693207/how-to-know-if-pdf-js-has-finished-rendering
      var pageRendering = page.render(renderContext);
      var completeCallback = pageRendering.internalRenderTask.callback;
      pageRendering.internalRenderTask.callback = function (error) {
        completeCallback.call(this, error);
        self.setState({content: textLayerBuilder.getRenderedElements()});
      };
    },
    shouldRepaint: function(other) {
      return other.fingerprint !== this.props.fingerprint;
    },
    getInitialState: function() {
      return {content: []};
    },
    componentDidUpdate: function(prevProps) {
      if(this.shouldRepaint(prevProps)) {
        this.renderPage(this.props.page);
      }
    },
    componentDidMount: function() {
      this.renderPage(this.props.page);
    },
    render: function() {
      var pageIndex = this.props.page.raw.pageInfo.pageIndex;
      var key = this.props.key;
      return (
          <div ref="container" className="page">
            <canvas key={"canvas_" + key} ref="canvas"></canvas>
            <TextLayer ref="textLayer"
                       pageIndex={pageIndex}
                       key={key}
                       callback={this.props.callback}
                       content={this.state.content} />
          </div>);
    }
  });

  var Scrollbar = React.createClass({
    componentWillUpdate: function() {
     var el = this.getDOMNode();
     var scrollbarHeight = el.clientHeight;
     var $container = $(el.parentNode).find(".scrollable");
     var nodes = $container.find(".textLayer div");
     var totalHeight = _.reduce(nodes.map(function(idx, node) { return node.clientHeight; }),
                               function(memo, num) { return memo + num; }, 0);
     console.log(totalHeight);
    },
    componentWillUnmount: function() {
      $(this.getDOMNode().parentNode).find(".scrollable").off("scroll");
    },
    componentDidMount: function() {
      $(this.getDOMNode().parentNode)
        .find(".scrollable").on("scroll", function(e) {
        });
    },
    render: function() {
      return <div className="scrollbar" />;
    }
  });

  var Display = React.createClass({
    getInitialState: function()  {
      return  {info: {}, pages: []};
    },
    fetchAnnotations: function(document) {
      Annotator.annotate(document)
        .then(function(results) {
          window.appState.results.set(results);
        });
    },
    componentWillReceiveProps: function(nextProps) {
      var self = this;
      var pdf = nextProps.pdf;
      var pages = _.map(_.range(1, pdf.numPages + 1), function(pageNr) {
        return pdf.getPage(pageNr);
      });

      Q.all(_.invoke(pages, "then", function(page) {
        return page.getTextContent().then(function(content) {
          return {
            raw: page,
            content: content
          };
        });
      })).then(function(pages) {
        var document = {info: pdf.pdfInfo, pages: pages };
        self.fetchAnnotations(document);
        self.setState(document);
      });
    },
    render: function() {
      var fingerprint = this.state.info.fingerprint;
      var pages = this.state.pages.map(function (page, idx) {
        var key = fingerprint + page.raw.pageInfo.pageIndex;
        return <Page page={page} key={key} />;
      });

      return(<div className="viewer-container">
               <Scrollbar />
               <div className="viewer scrollable">{pages}</div>
             </div>);
    }
  });

  return Display;
});
