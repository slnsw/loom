(function(utils) {
  'use strict';

  utils.CanvasUtils = {

    fillRoundedRect: function(context, x, y, w, h, r) {
      context.beginPath();
      context.moveTo(x + r, y);
      context.lineTo(x + w - r, y);
      context.quadraticCurveTo(x + w, y, x + w, y + r);
      context.lineTo(x + w, y + h - r);
      context.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      context.lineTo(x + r, y + h);
      context.quadraticCurveTo(x, y + h, x, y + h - r);
      context.lineTo(x, y + r);
      context.quadraticCurveTo(x, y, x + r, y);
      context.fill();
    },

    createCanvasWithImage: function(imageId, width, height) {
      var img = document.getElementById(imageId);
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(img, 0, 0, canvas.width, canvas.height);
      return canvas;
    },

    getImageData: function(elementId, width, height) {
      var canvas = window.CanvasUtils.createCanvasWithImage(elementId, width,
        height);
      var context = canvas.getContext('2d');
      var image = context.getImageData(0, 0, canvas.width, canvas.height);
      return image.data;
    },

    getImageDataFromTexture: function(texture, width, height) {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      canvas.width = width;
      canvas.height = height;
      context.drawImage(texture.image, 0, 0, canvas.width, canvas.height);
      var image = context.getImageData(0, 0, canvas.width, canvas.height);
      return image.data;
    }

  };
})(window.sl.loom.utils);
