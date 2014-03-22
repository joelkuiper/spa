/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['react', 'underscore','Q', 'jQuery', 'PDFJS', 'helpers/annotator'], function(React, _, Q, $, PDFJS, Annotator) {
  PDFJS.workerSrc = 'static/scripts/vendor/pdf.worker.js';

  var TextLayer = React.createClass({
    getNodeAnnotations: _.memoize(function(results, pageIndex, fingerprint) {
      var classes = _.pluck(results.result, "name");
      var annotations = _.pluck(results.result, "annotations");
      var nodesForPage = _.map(annotations, function(d) {
        return _.flatten(_.pluck(_.filter(d, function(dd) { return dd.page == pageIndex; }), "nodes"));
      });
      return _.object(classes, nodesForPage);
    }, function(results, pageIndex, fingerprint) {
      // hashFunction
      return 31 * (pageIndex + 1) * parseInt(fingerprint, 16) * results.timeStamp;
    }),
    render: function() {
      var results = this.props.appState.results.getValue();
      var pageIndex = this.props.pageIndex;
      console.log(pageIndex);
      var fingerprint = this.props.fingerprint;
      var annotations = this.getNodeAnnotations(results, pageIndex, fingerprint);

      var textNodes = this.props.content.map(function (o,i) {
        if(o.isWhitespace) { return null; }
        var isAnnotated = _.filter(annotations, function(a) { return  _.contains(a, i); }).length > 0;
        return (
            <div style={o.style}
                 dir={o.dir}
                 className={isAnnotated ? "annotated" : ""}
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

      var SCROLLBAR_PADDING = 10;
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
        // <canvas> may not be unmounted, so need to manually clear it for repaint
        var canvas = this.refs.canvas.getDOMNode();
        var context = canvas.getContext("2d");
        context.clearRect(0,0, canvas.width, canvas.height);
        this.renderPage(this.props.page);
      }
    },
    componentDidMount: function() {
      this.renderPage(this.props.page);
    },
    render: function() {
      var pageIndex = this.props.page.raw.pageInfo.pageIndex;
      console.log("a", pageIndex);
      var fingerprint = this.props.fingerprint;
      return (
          <div ref="container" className="page">
            <canvas ref="canvas"></canvas>
            <TextLayer ref="textLayer" pageIndex={pageIndex} fingerprint={fingerprint} content={this.state.content} appState={this.props.appState} />
          </div>);
    }
  });

  var Display = React.createClass({
    getInitialState: function()  {
      return  {info: {}, pages: []};
    },
    fetchAnnotations: function(document) {
      var self = this;
      Annotator.annotate(document)
        .then(function(results) { self.props.appState.results.set(results); });
    },
    componentWillReceiveProps: function(nextProps) {
      var self = this;
      var pdfData = nextProps.pdfData;
      if(pdfData.length > 0) {
        var pdf = PDFJS.getDocument(pdfData).then(function(pdf) {

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
            self.setState(document);
            self.fetchAnnotations(document);
          });
        });
      }
    },
    render: function() {
      var self = this;
      var fingerprint = this.state.info.fingerprint;
      var pages = this.state.pages.map(function (page) {
        return <Page page={page} fingerprint={fingerprint} appState={self.props.appState} />;
      });

      return <div id="main">{pages}</div>;
    }
  });

  return Display;
});
