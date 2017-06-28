(function(app) {
  'use strict';

  var favList;

  localforage.getItem('favoriteList').then(function(value) {
    favList = value || [];
  }, function(error) {
    console.error('FavoritesService > localforage: error:', error);
  });

  /**
   * Store a list of NumDocs from the JsonFiles.
   *
   * @return {Object} return only public methods
   */
  app.services.FavoritesService = function() {
    function add(docNum) {
      var index = favList.indexOf(docNum);

      if (index === -1) {
        favList.push(docNum);
        save();
      }
    }

    function remove(docNum) {
      var index = favList.indexOf(docNum);

      if (index > -1) {
        favList.splice(index, 1);
        save();
      }
    }

    function isFavorite(docNum) {
      return favList.indexOf(docNum) > -1;
    }

    function toggle(docNum) {
      var index = favList.indexOf(docNum);

      if (index === -1) {
        add(docNum);
        return true;
      }
      remove(docNum);
      return false;
    }

    function getList() {
      return favList;
    }

    function save() {
      localforage.setItem('favoriteList', favList).then(function() {
        // implement feedback
      }, function(error) {
        console.error('FavoritesService > localforage save item error:', error);
      });
    }

    return {
      add: add,
      remove: remove,
      getList: getList,
      toggle: toggle,
      isFavorite: isFavorite
    };
  };
})(window.sl.loom);
