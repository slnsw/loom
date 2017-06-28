(function(classPath) {
  'use strict';

  // Singleton
  classPath.GAService = {

    pageview: function(page, title) {
      var o = {page: page};

      if (title) {
        o.title = title;
      }

      ga('send', 'pageview', o);
    }

  };
})(window.sl.loom.services);
