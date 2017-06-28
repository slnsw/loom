(function(app) {
  'use strict';

  app.views.AppView = View;

  function View(model) {
    var initialized = new signals.Signal();
    var controller;
    var currentSubView;
    var mainNavView;
    var sidebarView;
    var sliderYear;
    var webglView;

    // dont need to render the webgl at the begining, wait until all images are
    //  loaded and the user click on the intro to start.
    var renderWebgl = false;
    var initialAssetsService;

    return {
      setController: setController,
      init: init,
      initialized: initialized,
      initWebgl: initWebgl,
      setInitialAssetsService: setInitialAssetsService
    };

    // Public Methods
    function setController(value) {
      controller = value;
    }

    function setInitialAssetsService(value) {
      initialAssetsService = value;
    }

    function init() {
      var cfg = app.models.configModel;
      model.stateChanged.add(modelStateChangedFirstTime);
      window.addEventListener('resize', onWindowResize, false);
      mainNavView = new app.views.MainNavView(model, controller);
      sidebarView = new app.views.SideBarView(model, controller);
      sliderYear = new app.views.SliderYear(cfg.startYear, cfg.endYear,
        cfg.gapYear);

      sliderYear.yearChanged.add(function(value) {
        controller.updateYear(value);
      });
    }

    function initWebgl() {
      webglView = new app.views.WebglView(model, initialAssetsService);
      webglView.itemsCreated.add(webglViewItemsCreated);
      webglView.init();
      render();
    }

    /**
     * Handler for StateChanged Signal, it will show the mainNav
     * for the first time after the SubView - TunnelView dispatch the
     * introCompleted signal
     *
     * @param  {String} state name of the current view
     */
    function modelStateChangedFirstTime(state) {
      // leave intro only
      if (state === 'Intro') {
        // Create introView
        currentSubView = new app.views.IntroView(webglView, model);
        currentSubView.name = state;
        currentSubView.setController(controller);
        currentSubView.setInitialAssetsService(initialAssetsService);
        currentSubView.introCompleted.addOnce(currentSubViewIntroCompleted);
        currentSubView.intro();

        // setting priority to 2 will make `handler2` execute before `handler1`
        model.stateChanged.add(modelStateChanged, null, 2);
      } else {
        // other views
        model.stateChanged.remove(modelStateChangedFirstTime);
        currentSubView.introCompleted.addOnce(showGlobalViews);
        renderWebgl = true;
        render();
      }
    }

    // model signal handlers
    function webglViewItemsCreated() {
      webglView.itemsCreated.remove(webglViewItemsCreated);
      initialized.dispatch();
    }

    function modelStateChanged(state) {
      var oldView = currentSubView;
      currentSubView = new app.views[state + 'View'](webglView, model);
      currentSubView.name = state;
      currentSubView.setController(controller);
      currentSubView.introCompleted.add(currentSubViewIntroCompleted);
      mainNavView.lock();
      sidebarView.collapse();
      sliderYear.disableInteraction();

      if (state === 'Map' || state === 'Tunnel' || state === 'Space') {
        currentSubView.setSliderYear(sliderYear);
      } else {
        sliderYear.outro();
      }

      // if (oldView !== undefined) {
      if (oldView) {
        oldView.outroCompleted.add(function() {
          oldView.destroy();
          currentSubView.intro();
        });
        oldView.outro();
      } else {
        currentSubView.intro();
      }
    }

    function currentSubViewIntroCompleted() {
      mainNavView.unlock();
      var name = currentSubView.name;
      if (name === 'Tunnel' || name === 'Map' || name === 'Space') {
        sliderYear.enableInteraction();
        sliderYear.intro();
      }
    }

    // Private Methods

    function render() {
      if (renderWebgl) {
        requestAnimationFrame(render);
      }

      // render subview!
      if (currentSubView) {
        currentSubView.render();
      }

      webglView.render();
    }

    function onWindowResize() {
      webglView.resize();

      if (currentSubView) {
        currentSubView.resize();
      }
    }

    function showGlobalViews() {
      mainNavView.show();
      sidebarView.show();
    }
  }
}(window.sl.loom));
