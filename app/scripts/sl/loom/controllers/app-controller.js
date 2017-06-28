(function(app) {
  'use strict';

  app.controllers.AppController = function(model, view) {
    // variables
    var scope = this;
    var service = new app.services.AppService();
    var initialAssetsService = new app.services.InitialAssetsService(model);
    var pageview = app.services.GAService.pageview;

    view.setInitialAssetsService(initialAssetsService);
    view.initialized.add(viewInitialized);

    return {
      goToFavoritesView: goToFavoritesView,
      goToIntroView: goToIntroView,
      goToItemView: goToItemView,
      goToMapView: goToMapView,
      goToSpaceView: goToSpaceView,
      goToTagsView: goToTagsView,
      goToTunnelView: goToTunnelView,
      init: init,
      updateYear: updateYear
    };

    // Public Methods

    function goToItemView(item) {
      pageview('/item-details');
      model.setSelectedItem(item);
      model.setState('Item');
      model.setYear(item.data.year);
    }

    function goToTagsView(tag) {
      pageview('/tag', tag.toLowerCase());
      model.setSelectedItem(null);
      model.setTag(tag);
      model.setState('Tags');
    }

    function goToMapView() {
      pageview('/atlas');
      model.setState('Map');
    }

    function goToSpaceView() {
      pageview('/space');
      model.setState('Space');
    }

    function goToTunnelView() {
      pageview('/looseleaf');
      model.setState('Tunnel');
    }

    function goToFavoritesView() {
      pageview('/favourites');
      model.setState('Favorites');
    }

    function goToIntroView() {
      pageview('/intro');
      model.setState('Intro');
    }

    function updateYear(value) {
      model.setYear(value);
    }

    function init() {
      service.dataLoaded.addOnce(serviceDataLoaded, scope);
      service.loadAreas();
    }

    // private methods
    function serviceDataLoaded(type, data) {
      if (type === 'areas') {
        model.setData(data);
        service.dataLoaded.removeAll();
        service = null;
        // service da ta loaded!!!
        goToIntroView();

        // load the initial assets after the data is loaded and parsed.
        // setTimeout(initialAssetsService.load, 1000);
        initialAssetsService.allItemsLoaded.addOnce(
          initialAssetsServiceAllItemsLoaded);
      }
    }

    /**
     * After all data is loaded and parsed, load the assets.
     *
     */
    function initialAssetsServiceAllItemsLoaded() {
      // destroy initialAssetsService
      // initialAssetsService.destroy();
      // initialAssetsService = null;
      view.initWebgl();
    }

    function viewInitialized() {
      // first state
      view.initialized.remove(viewInitialized);
      // var year = app.models.configModel.endYear;
      // year -= app.models.configModel.gapYear * 4;
      var year = 1935;
      model.setYear(year);
    }
  };
})(window.sl.loom);
