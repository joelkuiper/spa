define(['react', 'PDFJS'], function(React, PDFJS) {
    PDFJS.workerSrc = 'static/scripts/vendor/pdf.worker.js';

    var Display = React.createClass({
        render: function() {
            var pdfData = this.props.pdfData;
            if(pdfData.length > 0) {
                var pdf = PDFJS.getDocument(pdfData).then(function(pdf) {
                console.log(pdf);});
            }

            return <pre>I am a banana</pre>;
        }
    });

    return Display;
});
