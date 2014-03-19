'use strict';

define(['react', 'underscore','Q', 'jQuery', 'PDFJS'], function(React, _, Q, $, PDFJS) {
    PDFJS.workerSrc = 'static/scripts/vendor/pdf.worker.js';

    var Page = React.createClass({
        componentWillUpdate: function() {
            var canvas = this.refs.canvas.getDOMNode();
            var context = canvas.getContext("2d");
            context.clearRect(0,0, canvas.width, canvas.height);
            $(this.refs.textLayer.getDOMNode()).empty();
        },
        componentDidUpdate: function() {
            this.renderPage(this.props.page);
        },
        shouldComponentUpdate: function(nextProps) {
            return this.props.fingerprint !== nextProps.fingerprint;
        },
        renderPage: function(page) {
            var PADDING_AND_MARGIN = 175;

            var canvas = this.refs.canvas.getDOMNode();
            var container = this.refs.container.getDOMNode();
            var textLayerDiv = this.refs.textLayer.getDOMNode();
            var context = canvas.getContext("2d");

            var pageWidthScale = (container.clientWidth + PADDING_AND_MARGIN) / page.view[3];
            var viewport = page.getViewport(pageWidthScale);

            $(container)
                .css("height", viewport.height + "px")
                .css("width", viewport.width + "px");

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

            page.getTextContent().then(function (textContent) {
                var textLayerBuilder = new TextLayerBuilder({
                    textLayerDiv: textLayerDiv,
                    pageIndex: page.pageIndex
                });

                textLayerBuilder.setTextContent(textContent);
                var renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                    textLayer: textLayerBuilder
                };
                page.render(renderContext);
            });

        },
        componentDidMount: function() {
            this.renderPage(this.props.page);
        },
        render: function() {
            var pageIndex = this.props.page.pageInfo.pageIndex;
            return (
              <div ref="container" id={"pageContainer-" + pageIndex} className="page">
                  <canvas ref="canvas"></canvas>
                  <div className="textLayer" ref="textLayer"></div>
              </div>);
        }
    });

    var Display = React.createClass({
        getInitialState: function()  {
            return {document: {info: {}, pages: []}};
        },
        componentWillReceiveProps: function(nextProps) {
            var self = this;
            var pdfData = nextProps.pdfData;
            if(pdfData.length > 0) {
                var pdf = PDFJS.getDocument(pdfData).then(function(pdf) {
                    var pages = _.map(_.range(1, pdf.numPages + 1), function(pageNr) {
                        return pdf.getPage(pageNr);
                    });
                    Q.all(pages).then(function(pages) {
                        self.setState({document: {info: pdf.pdfInfo, pages: pages}});
                    });
                });
            }

        },
        render: function() {
            var fingerprint = this.state.document.info.fingerprint;
            var pages = this.state.document.pages.map(function (page) {
                return <Page page={page} fingerprint={fingerprint} />;
            });

            return <div id="main">{pages}</div>;
        }
    });

    return Display;
});
