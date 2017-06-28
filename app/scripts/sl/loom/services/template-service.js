(function(classPath) {
  'use strict';

  // Singleton
  classPath.TemplateService = new Service();

  function Service() {
    var loaded = new signals.Signal();
    var templatesDict = {};

    /**
     * ADD TEMPLATES TO BE LOADED UPFRONT HERE!!!
     */
    var list = [
      'intro.html',
      'item-details-horizontal.html',
      'item-details.html',
      'map-area-label.html',
      'sidebar-about.html',
      'sidebar-data.html',
      'sidebar-makers.html',
      'sidebar-views.html',
      'sidebar.html',
      'tooltip.html'
    ];

    function load() {
      loadNextTemplate();
    }

    /**
     *  get the template to compile.
     *  usage: templateService.get( 'about.html' )({msg: 'hello'});
     *
     * @param  {string}   url       'about.html'
     * @return {function} template  underscore template to compile
     */
    function get(url) {
      return templatesDict[url];
    }

    function loadNextTemplate() {
      if (list.length > 0) {
        loadTemplate(list.shift());
      } else {
        loaded.dispatch();
      }
    }

    function loadTemplate(url) {
      $.get('templates/' + url).then(function(data) {
        templatesDict[url] = _.template(data);
        loadNextTemplate();
      }, function(error) {
        console.error('loadTemplate error:', error);
      });
    }

    return {
      loaded: loaded,
      load: load,
      get: get
    };
  }
})(window.sl.loom.services);
