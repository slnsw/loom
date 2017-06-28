(function(app) {
  'use strict';

  app.utils.ColorUtils = {

    getColorByYear: function(year) {
      var y = parseInt(year, 10);
      var mod = y % app.models.configModel.gapYear;
      var colorIndex = y - mod;
      colorIndex = y - app.models.configModel.startYear;
      colorIndex = Math.floor(colorIndex / app.models.configModel.gapYear);
      return app.models.configModel.colorsByYear[colorIndex];
    }

  };
})(window.sl.loom);
