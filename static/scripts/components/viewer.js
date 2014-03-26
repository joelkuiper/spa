/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js-indent-level: 2; -*- */

'use strict';

define(['react', 'underscore','Q', 'jQuery', 'helpers/annotator'], function(React, _, Q, $, Annotator) {
  var OUTPUT_SCALE = getOutputScale(document.createElement("canvas").getContext("2d"));

  var TextLayer = React.createClass({
    componentDidUpdate: function() {
      console.log(this.props.pageIndex, this.getDOMNode().childNodes.length);
    },
    getNodeAnnotations: _.memoize(function(results, pageIndex, key) {
      var ids = _.pluck(results.result, "id");
      var annotations = _.pluck(results.result, "annotations");
      var nodesForPage = _.map(annotations, function(o) {
        return _.flatten(_.pluck(_.filter(o, function(oo) {
          return oo.page == pageIndex; }), "nodes"));
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
    drawPage: function(page) {
      var self = this;
      var content = page.content;
      page = page.raw;

      var container = this.getDOMNode();

      var canvas = this.refs.canvas.getDOMNode();
      var textLayerDiv = this.refs.textLayer.getDOMNode();
      var ctx = canvas.getContext("2d");

      var SCROLLBAR_PADDING = 0;
      var viewport = page.getViewport(1.0);
      var pageWidthScale = (container.clientWidth - SCROLLBAR_PADDING) / viewport.width;
      viewport = page.getViewport(pageWidthScale);

      //Checks scaling on the ctx if we are on a HiDPI display
      var outputScale = getOutputScale(ctx);

      if (outputScale.scaled) {
        // scale up canvas (since the -transform reduces overall dimensions and not just the contents)
        canvas.width = (Math.floor(viewport.width) * outputScale.sx) | 0;
        canvas.height = (Math.floor(viewport.height) * outputScale.sy) | 0;
        var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' + (1 / outputScale.sy) + ')';
        CustomStyle.setProp('transform', canvas, cssScale);
        CustomStyle.setProp('transformOrigin', canvas, '0% 0%');

        ctx.scale(outputScale.sx, outputScale.sy);

        // textLayerDiv
        CustomStyle.setProp('transform', textLayerDiv, cssScale);
        CustomStyle.setProp('transformOrigin', textLayerDiv, '0% 0%');
      } else {
        canvas.height = viewport.height;
        canvas.width = viewport.width;
      }

      var textLayerBuilder = new TextLayerBuilder();
      textLayerBuilder.setTextContent(content);

      var renderContext = {
        canvasContext: ctx,
        viewport: viewport,
        textLayer: textLayerBuilder
      };

      // from http://stackoverflow.com/questions/12693207/how-to-know-if-pdf-js-has-finished-rendering
      var pageRendering = page.render(renderContext);
      var completeCallback = pageRendering.internalRenderTask.callback;
      pageRendering.internalRenderTask.callback = function(error) {
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
        this.drawPage(this.props.page);
      }
    },
    componentDidMount: function() {
      this.drawPage(this.props.page);
    },
    render: function() {
      var pageIndex = this.props.page.raw.pageInfo.pageIndex;
      var key = this.props.key;
      return (
          <div className="page">
            <canvas key={"canvas_" + key} ref="canvas"></canvas>
            <TextLayer ref="textLayer"
                       pageIndex={pageIndex}
                       key={key}
                       content={this.state.content} />
          </div>);
    }
  });

  var Display = React.createClass({
    getInitialState: function()  {
      return  {info: {}, pages: [] };
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
      if(this.state.info.fingerprint !== nextProps.pdf.pdfInfo.fingerprint) {
        var pages = _.map(_.range(1, pdf.numPages + 1), function(pageNr) {
          return pdf.getPage(pageNr);
        });

        Q.all(_.invoke(pages, "then", function(page) {
          return page.getTextContent().then(function(content) {
            return {raw: page, content: content};
          });
        })).then(function(pages) {
          var document = {info: pdf.pdfInfo, pages: pages };
          self.fetchAnnotations(document);
          self.setState(document);
        });
      }
    },
    render: function() {
      var self = this;
      var fingerprint = this.state.info.fingerprint;

      var pages = this.state.pages.map(function (page, idx) {
        var key = fingerprint + page.raw.pageInfo.pageIndex;
        return <Page page={page} key={key} />;
      });
      return(<div className="viewer-container">
               <div className="viewer">
                 {pages}
               </div>
             </div>);
    }
  });

  return Display;
});
