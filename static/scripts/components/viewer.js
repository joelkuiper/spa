/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['react', 'underscore','Q', 'jQuery', 'PDFJS', 'helpers/annotator'], function(React, _, Q, $, PDFJS, Annotator) {
  PDFJS.workerSrc = 'static/scripts/vendor/pdf.worker.js';

  var TextLayer = React.createClass({
    render: function() {
      var textNodes = this.props.content.map(function (o) {
        if(o.isWhitespace) { return null; }
        return (
          <div style={o.style}
               dir={o.dir}
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

      var PADDING_AND_MARGIN = 175;

      var canvas = this.refs.canvas.getDOMNode();
      var container = this.refs.container.getDOMNode();
      var textLayerDiv = this.refs.textLayer.getDOMNode();
      var context = canvas.getContext("2d");

      var pageWidthScale = (container.clientWidth + PADDING_AND_MARGIN) / page.view[3];
      var viewport = page.getViewport(pageWidthScale);

      //Checks scaling on the context if we are on a HiDPI display
      var outputScale = getOutputScale(context);
      context._scaleX = outputScale.sx;
      context._scaleY = outputScale.sy;

      if (outputScale.scaled) {
        // scale up canvas (since the -transform reduces overall dimensions and not just the contents)
        canvas.height = viewport.height * outputScale.sy;
        canvas.width = viewport.width * outputScale.sx;
        var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' + (1 / outputScale.sy) + ')';
        $(canvas)
          .css("transform", cssScale)
          .css("transformOrigin", "0% 0%");

        context.scale(outputScale.sx, outputScale.sy);

        // textLayerDiv
        $(textLayerDiv)
          .css("transform", cssScale)
          .css("transformOrigin", "0% 0%");
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
      return (
          <div ref="container" id={"pageContainer-" + pageIndex} className="page">
            <canvas ref="canvas"></canvas>
            <TextLayer ref="textLayer" content={this.state.content} />
          </div>);
    }
  });

  var Display = React.createClass({
    getInitialState: function()  {
      return  {info: {}, pages: []};
    },
    fetchAnnotations: function(document) {
      Annotator.annotate(document);
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
