define(['react', 'underscore','Q', 'PDFJS'], function(React, _, Q, PDFJS) {
    PDFJS.workerSrc = 'static/scripts/vendor/pdf.worker.js';

    var Page = React.createClass({
        componentWillUpdate: function() {
            var canvas = this.refs.canvas.getDOMNode();
            var context = canvas.getContext("2d");
            context.clearRect(0,0, canvas.width, canvas.height);
        },
        componentDidUpdate: function() {
            this.renderPage(this.props.page, this.refs.canvas.getDOMNode());
        },
        shouldComponentUpdate: function(nextProps) {
            return this.props.fingerprint !== nextProps.fingerprint;
        },
        renderPage: function(page, canvas) {
            var container = document.getElementById("main");

            var PADDING_AND_MARGIN = 175;
            var pageWidthScale = (container.clientWidth + PADDING_AND_MARGIN) / page.view[3];
            var viewport = page.getViewport(pageWidthScale);
            var style =  { width: viewport.width + "px",
                           height: viewport.height + "px" };
            var css = _.reduce(_.pairs(style), function(memo, el) { return el[0] + ":" + el[1] + ";" + memo; }, "");
            var pageContainer = this.refs.container.getDOMNode();
            pageContainer.style.cssText = css;

            var context = canvas.getContext("2d");

            //Checks scaling on the context if we are on a HiDPI display
            var outputScale = getOutputScale(context);

            if (outputScale.scaled) {
                // scale up canvas (since the -transform reduces overall dimensions and not just the contents)
                canvas.height = viewport.height * outputScale.sy;
                canvas.width = viewport.width * outputScale.sx;
            } else {
                canvas.height = viewport.height;
                canvas.width = viewport.width;
            }

            context._scaleX = outputScale.sx;
            context._scaleY = outputScale.sy;
            if (outputScale.scaled) {
                context.scale(outputScale.sx, outputScale.sy);
            }

            var renderContext = {
                canvasContext: context,
                viewport: viewport
                //textLayer: textLayer
            };

            page.render(renderContext);

        },
        componentDidMount: function() {
            this.renderPage(this.props.page, this.refs.canvas.getDOMNode());
        },
        render: function() {
            return (
               <div ref="container" id={"pageContainer-" + this.props.page.pageInfo.pageIndex} className="page">
                    <canvas ref="canvas"></canvas>
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
