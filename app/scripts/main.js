(function(app) {
  'use strict';

  function init() {
    var appModel = new app.models.AppModel();
    var appView = new app.views.AppView(appModel);
    var appController = new app.controllers.AppController(appModel, appView);

    appView.setController(appController);
    appView.init();
    appController.init();
  }

  function loadTemplates() {
    var ts = app.services.TemplateService;

    ts.loaded.addOnce(function() {
      // init();
      loadTopics();
    });

    ts.load();
  }

  function loadTopics() {
    app.services.TopicsService.load().then(init, function(error) {
      console.log(error);
    });
  }

  function loadConfig() {
    var s = new app.services.AppService();
    s.dataLoaded.addOnce(function(type, data) {
      if (type === 'config') {
        // copy props
        for (var p in data) {
          if (data.hasOwnProperty(p)) {
            app.models.configModel[p] = data[p];
          }
        }

        loadTemplates();
      }
    });
    s.loadConfig();
  }

  window.onload = function() {
    // this is not the best approach!!!
    // this decision should be on the server side.
    // and the mobile page should be a very simple html page.
    if (device.mobile()) {
      $('#mobile-page').show();
      $('.main-nav').remove();
      $('.tunnel-nav').remove();
      $('body').css('width', '100%');
      $('body').css('height', '100%');
    } else if (Detector.webgl) {
      $('#mobile-page').remove();
      loadConfig();
    } else {
      Detector.addGetWebGLMessage();
    }
  };
})(window.sl.loom);
