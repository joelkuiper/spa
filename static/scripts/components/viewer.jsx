/* -*- mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2 -*- */
define(['react', 'underscore','Q', 'jQuery'], function(React, _, Q, $) {
  'use strict';

  var TextLayer = React.createClass({
    componentDidUpdate: function(prevProps, prevState) {
      var appState = this.props.appState;
      var children = this.getDOMNode().childNodes;
      if(children.length > 0) {
        var textDivs = appState.get("minimap");
        textDivs[this.props.pageIndex] = children;
        appState.trigger("update:minimap");
      }
    },
    getNodeAnnotations: function(results, pageIndex) {
      // We would like {node_index: [nodes], node_index: [nodes]}
      // With the nodes having a specific type
      // filtered per page
      var acc = {};
      results.each(function(result) {
        var id = result.get("id");
        var annotations = result.get("annotations");
        _.each(annotations, function(annotation) {
          _.each(annotation.nodes, function(node) {
            if(node.pageIndex === pageIndex) {
              node["type"] = id;
              acc[node.index] = _.union(acc[node.index] || [], node);
            }
          });
        });
      });
      return acc;
    },
    render: function() {
      var results = this.props.results
        , pageIndex = this.props.pageIndex
        , key = this.props.key
        , annotations = this.getNodeAnnotations(results, pageIndex);

      var getAnnotation = function(annotations) {
        return _.filter(annotations, function(c) {
          var result = results.find(function(el) {
            return el.id === c.type;
          });
          return result.get("active");
        });
      };

      var textNodes = this.props.content.map(function (o,i) {
        if(o.isWhitespace) { return null; }
        var annotation = getAnnotation(annotations[i])[0];

        if(annotation) {
          var className = annotation.type + "_annotation "
            , text = o.textContent
            , left = annotation.range[0] - annotation.interval[0]
            , right = text.length + (annotation.range[1] - annotation.interval[1]);
          return (
              <div style={o.style}
                   dir={o.dir}
                   key={key + i}
                   className={className}
                   data-canvas-width={o.canvasWidth}
                   data-font-name={o.fontName}>
                {text.slice(0, left)}
                <span className={className + " annotated"}>{text.slice(left, right)}</span>
                {text.slice(right, text.length)}
            </div>
          );

        } else {
          return (
              <div style={o.style}
                   dir={o.dir}
                   key={key + i}
                   data-canvas-width={o.canvasWidth}
                   data-font-name={o.fontName}>
              {o.textContent}
            </div>
          );
        }
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

      var outputScale = getOutputScale(ctx);

      canvas.width = (Math.floor(viewport.width) * outputScale.sx) | 0;
      canvas.height = (Math.floor(viewport.height) * outputScale.sy) | 0;
      canvas.style.width = Math.floor(viewport.width) + 'px';
      canvas.style.height = Math.floor(viewport.height) + 'px';

      textLayerDiv.style.width = canvas.width + 'px';
      textLayerDiv.style.height = canvas.height + 'px';

      // Add the viewport so it's known what it was originally drawn with.
      canvas._viewport = viewport;

      ctx._scaleX = outputScale.sx;
      ctx._scaleY = outputScale.sy;

      if (outputScale.scaled) {
        ctx.scale(outputScale.sx, outputScale.sy);
        var cssScale = 'scale(' + (1 / outputScale.sx) + ', ' + (1 / outputScale.sy) + ')';
        CustomStyle.setProp('transform' , textLayerDiv, cssScale);
        CustomStyle.setProp('transformOrigin' , textLayerDiv, '0% 0%');
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
                       key={"textLayer_" + key}
                       appState={this.props.appState}
                       results={this.props.results}
                       content={this.state.content} />
          </div>);
    }
  });

  var Display = React.createClass({
    getInitialState: function()  {
      return  {info: {}, pages: []};
    },
    componentWillReceiveProps: function(nextProps) {
      var self = this;
      var pdf = nextProps.pdf;
      var pages = _.map(_.range(1, pdf.numPages + 1), function(pageNr) {
        return pdf.getPage(pageNr);
      });

      Q.all(_.invoke(pages, "then", function(page) {
        return page.getTextContent().then(function(content) {
          return {raw: page, content: content};
        });
      })).then(function(pages) {
        var document = {info: pdf.pdfInfo, pages: pages };
        self.setState(document);
        self.props.results.fetch(document);
      });
    },
    render: function() {
      var self = this;
      var fingerprint = this.state.info.fingerprint;
      var pages = this.state.pages.map(function (page, idx) {
        var key = fingerprint + page.raw.pageInfo.pageIndex;
        return <Page page={page}
                     results={self.props.results}
                     appState={self.props.appState}
                     key={key} />;
      });
      return(<div className="viewer-container">
               <div className="viewer">{pages}</div>
             </div>);
    }
  });

  return Display;
});
