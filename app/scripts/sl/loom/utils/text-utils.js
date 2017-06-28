(function(utils, config) {
  'use strict';

  utils.TextUtils = {

    getTextWidth: function(text, font) {
      var canvas = document.createElement('canvas');
      var context = canvas.getContext('2d');
      context.font = font;
      var textMetrics = context.measureText(text);
      return Math.ceil(textMetrics.width);
    },

    createText: function(text, x, y, z, width, height, fontSize) {
      var dynamicTexture = new THREEx.DynamicTexture(width, height);
      var material = new THREE.MeshBasicMaterial({
        map: dynamicTexture.texture
      });

      material.transparent = true;
      dynamicTexture.clear('rgba(255, 255, 255, 0)');
      dynamicTexture.context.font = fontSize + ' Roboto, Arial, sans-serif';
      dynamicTexture.drawTextCooked(text, {
        lineHeight: 0.7,
        fillStyle: config.textColor,
        align: 'left'
      });

      var geometry = new THREE.PlaneBufferGeometry(width, height, 5, 5);
      var text3d = new THREE.Mesh(geometry, material);
      text3d.position.x = x;
      text3d.position.y = y;
      text3d.position.z = z;
      text3d.data = {text: text};
      return text3d;
    }

  };
})(window.sl.loom.utils, window.sl.loom.models.configModel);
