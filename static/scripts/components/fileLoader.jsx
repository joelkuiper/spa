/* -*- mode: js2; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2 -*- */
define(['react'], function(React) {
  'use strict';

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

  return React.createClass({
    loadFile: function() {
      var self = this;
      var file = this.refs.file.getDOMNode().files[0];
      if (file.type.match(this.props.mimeType)) {
        var reader = new FileReader();
        reader.onload = function(e) {
          var data =  convertDataURIToBinary(reader.result);
          self.props.model.set({data:data});
        };
        reader.readAsDataURL(file);
      } else {
        alert("File not supported! Probably not a PDF");
      }
      return false;
    },
    render: function() {
      return(
         <form enctype="multipart/form-data" onSubmit={this.loadFile}>
           <input name="file" type="file" ref="file" />
           <input type="submit" className="button secondary small" value="Upload" />
         </form>);
    }
  });

});
