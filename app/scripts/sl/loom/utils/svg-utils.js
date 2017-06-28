(function(app) {
  'use strict';

  app.utils.SVGUtils = {

    loadSvg: function(svgFile, element) {
      $.get('images/ui/' + svgFile, null, function(data) {
        var svgNode = $('svg', data);
        var docNode = document.adoptNode(svgNode[0]);
        element.html(docNode);
      }, 'xml');
    }

  };
})(window.sl.loom);
