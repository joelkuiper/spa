/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */

'use strict';

define(['react', 'jsx!components/results', 'jsx!components/viewer', 'PDFJS'], function(React, Results, Viewer, PDFJS) {
  // from http://stackoverflow.com/questions/12092633/pdf-js-rendering-a-pdf-file-using-a-base64-file-source-instead-of-url
  var BASE64_MARKER = ';base64,';
  function convertDataURIToBinary(dataURI) {
    var base64Index = dataURI.indexOf(BASE64_MARKER) + BASE64_MARKER.length;
    var base64 = dataURI.substring(base64Index);
    var raw = window.atob(base64);
    var rawLength = raw.length;
    var array = new Uint8Array(new ArrayBuffer(rawLength));

    for(var i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    return array;
  }

  var App = React.createClass({
    loadPdf: function() {
      var self = this;
      var file = this.refs.file.getDOMNode().files[0];
      var pdfType = /application\/(x-)?pdf|text\/pdf/;
      if (file.type.match(pdfType)) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var pdfData =  convertDataURIToBinary(reader.result);

          PDFJS.getDocument(pdfData).then(function(pdf) {
            self.setProps({pdf:pdf});
          });
        };
        reader.readAsDataURL(file);
      } else {
        alert("File not supported! Probably not a PDF");
      }
      return false;
    },
    render: function() {
      return (
          <div>
            <Viewer pdf={this.props.pdf} appState={this.props.appState} />
            <div id="side">
                <form enctype="multipart/form-data" onSubmit={this.loadPdf}>
                <input name="file" type="file" ref="file" />
                <input type="submit" className="pure-button" value="Upload" />
              </form>
              <Results appState={this.props.appState} />
            </div>
          </div>
      );
    }
  });

  return App;
});
