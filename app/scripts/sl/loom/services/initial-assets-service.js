(function(classPath) {
  'use strict';

  classPath.InitialAssetsService = InitialAssetsService;

  function InitialAssetsService(appModel) {
    var itemLoaded = new signals.Signal();
    var allItemsLoaded = new signals.Signal();
    var manager = new THREE.LoadingManager();
    var textures = {};
    // var manager = THREE.DefaultLoadingManager;
    manager.onProgress = function(item, loaded, total) {
      itemLoaded.dispatch(item, loaded, total);
    };

    manager.onLoad = function() {
      allItemsLoaded.dispatch();
    };

    manager.onError = function(error) {
      console.error(error);
    };

    /**
     * add all static images to be used with THREE that needs to be loaded
     * upfront.
     */
    function load() {
      var list = [
        // map view images
        'images/map/map.png',
        'images/map/heightmap.png',
        'images/map/areas.png',

        // item view images
        'images/ui/details-icon-fav.png',
        'images/ui/details-icon-fav-dark.png',
        'images/ui/details-icon-link.png',

        // favorites view
        'images/ui/favorites-empty-msg.png',

        // favorites and tags view
        'images/ui/pagination-next-btn.jpg',
        'images/ui/pagination-previous-btn.jpg'
      ];

      // add all images from the thumbs used in TunnelView
      var tunnelItemsData = appModel.getTunnelItemsData();

      tunnelItemsData.forEach(function(item) {
        list.push(item.thumbUrl);
      });
      list.forEach(function(item) {
        // the images will be cached.
        textures[item] = new THREE.TextureLoader(manager).load(item);
      });
    }

    function destroy() {
      allItemsLoaded.removeAll();
      allItemsLoaded = null;
      itemLoaded.removeAll();
      itemLoaded = null;
      manager.onError = undefined;
      manager.onLoad = undefined;
      manager.onProgress = undefined;
    }

    function getTexture(url) {
      if (textures.hasOwnProperty(url)) {
        return textures[url];
      }
      textures[url] = new THREE.TextureLoader(manager).load(url);
      return textures[url];
    }

    return {
      getTexture: getTexture,
      manager: manager,
      allItemsLoaded: allItemsLoaded,
      destroy: destroy,
      itemLoaded: itemLoaded,
      load: load
    };
  }
})(window.sl.loom.services);
