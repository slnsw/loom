(function(app) {
  'use strict';

  app.views.MainNavView = function(model, ctrl) {
    var controller = ctrl;
    var $el = $('.main-nav');
    var $favBtn = $el.find('.fav-btn');
    var $tunnelBtn = $el.find('.tunnel-btn');
    var $mapBtn = $el.find('.map-btn');
    var $spaceBtn = $el.find('.space-btn');
    var enabled = false;

    model.stateChanged.add(modelStateChanged);
    $el.hide();

    app.utils.SVGUtils.loadSvg('nav-icon-fav.svg', $favBtn);
    app.utils.SVGUtils.loadSvg('nav-icon-map.svg', $mapBtn);
    // app.utils.SVGUtils.loadSvg('nav-icon-space.svg', $spaceBtn);
    app.utils.SVGUtils.loadSvg('nav-icon-tunnel.svg', $tunnelBtn);

    return {
      show: show,
      hide: hide,
      lock: lock,
      unlock: unlock
    };

    function lock() {
      disableInteraction();
    }

    function unlock() {
      enableInteraction();
    }

    function show() {
      $el.fadeIn(400);
      enableInteraction();
    }

    function hide() {
      $el.fadeOut(400);
      disableInteraction();
    }

    function enableInteraction() {
      if (!enabled) {
        enabled = true;
        $favBtn.on('click', favBtnClick);
        $mapBtn.on('click', mapBtnClick);
        $spaceBtn.on('click', spaceBtnClick);
        $tunnelBtn.on('click', tunnelBtnClick);
      }
    }

    function disableInteraction() {
      if (enabled) {
        enabled = false;
        $favBtn.off('click', favBtnClick);
        $mapBtn.off('click', mapBtnClick);
        $spaceBtn.off('click', spaceBtnClick);
        $tunnelBtn.off('click', tunnelBtnClick);
      }
    }

    function favBtnClick(event) {
      event.preventDefault();
      controller.goToFavoritesView();
    }

    function mapBtnClick(event) {
      event.preventDefault();
      controller.goToMapView();
    }

    function spaceBtnClick(event) {
      event.preventDefault();
      controller.goToSpaceView();
    }

    function tunnelBtnClick(event) {
      event.preventDefault();
      controller.goToTunnelView();
    }

    function modelStateChanged(state) {
      $favBtn.removeClass('selected');
      $mapBtn.removeClass('selected');
      $spaceBtn.removeClass('selected');
      $tunnelBtn.removeClass('selected');

      switch (state) {
        case 'Favorites':
          $favBtn.addClass('selected');
          break;

        case 'Map':
          $mapBtn.addClass('selected');
          break;

        case 'Space':
          $spaceBtn.addClass('selected');
          break;

        case 'Tunnel':
          $tunnelBtn.addClass('selected');
          break;

        default:
      }
    }
  };
})(window.sl.loom);
