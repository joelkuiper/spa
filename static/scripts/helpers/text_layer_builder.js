/* -*- tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2; js2-basic-offset: 2; -*- */
/* Copyright 2012 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* globals CustomStyle, PDFFindController, scrollIntoView */

'use strict';

/**
 * TextLayerBuilder provides text-selection
 * functionality for the PDF. It does this
 * by creating overlay divs over the PDF
 * text. This divs contain text that matches
 * the PDF text they are overlaying. This
 * object also provides for a way to highlight
 * text that is being searched for.
 */
var TextLayerBuilder = function textLayerBuilder(options) {
  this.layoutDone = false;
  this.divContentDone = false;
  this.matches = [];

  if(typeof PDFFindController === 'undefined') {
      window.PDFFindController = null;
  }

  if(typeof this.lastScrollSource === 'undefined') {
      this.lastScrollSource = null;
  }

  this.beginLayout = function textLayerBuilderBeginLayout() {
    this.textDivs = [];
    this.renderingDone = false;
  };

  this.endLayout = function textLayerBuilderEndLayout() {
    this.layoutDone = true;
    this.insertDivContent();
  };

  this.setupRenderLayoutTimer = function textLayerSetupRenderLayoutTimer() {
    // Rendering is done in React, so we don't care here.
    // Original implementation delayed painting if the user was scrolling
    this.renderLayer();
  };

  this.renderLayer = function textLayerBuilderRenderLayer() {
    var textDivs = this.textDivs;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    // No point in rendering so many divs as it'd make the browser unusable
    // even after the divs are rendered
    var MAX_TEXT_DIVS_TO_RENDER = 100000;
    if (textDivs.length > MAX_TEXT_DIVS_TO_RENDER) return;

    for (var i = 0, ii = textDivs.length; i < ii; i++) {
      var textDiv = textDivs[i];

      ctx.font = textDiv.style.fontSize + ' ' + textDiv.style.fontFamily;
      var width = ctx.measureText(textDiv.textContent).width;

      var textScale = textDiv.canvasWidth / width;
      var rotation = textDiv.angle;
      var transform = 'scale(' + textScale + ', 1)';
      transform = 'rotate(' + rotation + 'deg) ' + transform;
      textDiv.style.transform = transform;
      textDiv.style.transformOrigin = '0% 0%';

      if (width <= 0) {
        textDiv.isWhitespace = true;
      }
    }

    this.renderingDone = true;
  };

  this.getRenderedElements = function() {
    return this.textDivs;
  };

  this.appendText = function textLayerBuilderAppendText(geom) {
    // vScale and hScale already contain the scaling to pixel units
    var fontHeight = geom.fontSize * Math.abs(geom.vScale);
    var fontAscent = geom.ascent ? geom.ascent * fontHeight :
          geom.descent ? (1 + geom.descent) * fontHeight : fontHeight;

    var style = {
      fontSize: fontHeight + "px",
      fontFamily: geom.fontFamily,
      left:  (geom.x + (fontAscent * Math.sin(geom.angle))) + 'px',
      top:  (geom.y - (fontAscent * Math.cos(geom.angle))) + 'px'
    };

    var textElement = {
      canvasWidth:  geom.canvasWidth * Math.abs(geom.hScale),
      fontName: geom.fontName,
      angle:  geom.angle * (180 / Math.PI),
      style: style
    };

    // The content of the div is set in the `setTextContent` function.
    this.textDivs.push(textElement);
  };

  this.insertDivContent = function textLayerUpdateTextContent() {
    // Only set the content of the divs once layout has finished, the content
    // for the divs is available and content is not yet set on the divs.
    if (!this.layoutDone || this.divContentDone || !this.textContent)
      return;

    this.divContentDone = true;

    var textDivs = this.textDivs;
    var bidiTexts = this.textContent;

    for (var i = 0; i < bidiTexts.length; i++) {
      var bidiText = bidiTexts[i];
      var textDiv = textDivs[i];
      if (!/\S/.test(bidiText.str)) {
        textDiv.isWhitespace = true;
        continue;
      }

      textDiv.textContent = bidiText.str;
      // TODO refactor text layer to use text content position
      /**
       * var arr = this.viewport.convertToViewportPoint(bidiText.x, bidiText.y);
       * textDiv.style.left = arr[0] + 'px';
       * textDiv.style.top = arr[1] + 'px';
       */
      // bidiText.dir may be 'ttb' for vertical texts.
      textDiv.dir = bidiText.dir;
    }

    this.setupRenderLayoutTimer();
  };

  this.setTextContent = function textLayerBuilderSetTextContent(textContent) {
    this.textContent = textContent;
    this.insertDivContent();
  };

  this.convertMatches = function textLayerBuilderConvertMatches(matches) {
    // NOT IMPLEMENTED
    return;
  };

  this.renderMatches = function textLayerBuilder_renderMatches(matches) {
    // NOT IMPLEMENTED
    return;
  };

  this.updateMatches = function textLayerUpdateMatches() {
    // NOT IMPLEMENTED
    return;
  };
};
