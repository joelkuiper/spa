define(['react'], function(React) {
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

//   $(document).ready(function() {
//
//        var fileInput = document.getElementById('fileInput');
//        var submit = document.getElementById('upload');
//
//        submit.addEventListener('click', function(e) {
//            var file = fileInput.files[0];
//            var textType = /application\/(x-)?pdf|text\/pdf/;
//            if (file.type.match(textType)) {
//                var reader = new FileReader();
//
//                reader.onload = function(e) {
//                    document.getElementById('pdfContainer').innerHTML = ""; // clear the container
//                    loadPdf(convertDataURIToBinary(reader.result));
//                };
//
//                reader.readAsDataURL(file);
//            } else {
//                alert("File not supported! Probably not a PDF");
//            }
//        });
//    });



    var SideBar = React.createClass({
        getInitialState: function() {
            return {};
        },
        componentDidMount: function(el, root) {
        },
        render: function() {
            return(
                <div id="side">
                    <form enctype="multipart/form-data">
                        <input name="file" type="file" id="fileInput"  />
                        <input type="button" className="pure-button" value="Upload" id="upload" />
                    </form>
                </div>);
        }
    });

    return SideBar;

});
