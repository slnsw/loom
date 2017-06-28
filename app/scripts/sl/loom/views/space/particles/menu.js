(function(app) {
  'use strict';

  var classPath = app.views.space.particles;

  var Menu = function() {
    this.areaSelected = new signals.Signal();
    this.topicHovered = new signals.Signal();
    this.topicClicked = new signals.Signal();

    this.container = document.createElement('div');
    this.container.className = 'particles-menu';
    this.currentColor = '';
    document.body.appendChild(this.container);

    this.areasMenu = new classPath.AreasMenu(this.container);
    this.topTopicsMenu = new classPath.TopTopicsMenu(this.container);

    var TopicsService = app.services.TopicsService;
    this.areasMenu.setList(TopicsService.areas);
  };

  Menu.prototype = {

    constructor: Menu,

    destroy: function() {
      this.areasMenu.destroy();
      this.topTopicsMenu.destroy();
      this.areaSelected.dispose();
      this.topicClicked.dispose();
      this.topicHovered.dispose();

      document.body.removeChild(this.container);

      this.areasMenu = null;
      this.container = null;
      this.currentColor = null;
      this.topTopicsMenu = null;
    },

    open: function() {
      this.areasMenu.open();
      this.areasMenu.itemSelected.add(this.onAreasMenuItemSelected, this);
      this.topTopicsMenu.open();
      this.topTopicsMenu.itemClicked.add(this.onTopTopicsItemClicked, this);
      this.topTopicsMenu.itemHovered.add(this.onTopTopicsItemHovered, this);
      this.container.className = 'particles-menu open';
    },

    close: function() {
      this.areasMenu.itemSelected.remove(this.onAreasMenuItemSelected, this);
      this.areasMenu.close();
      this.topTopicsMenu.itemClicked
        .remove(this.onTopTopicsItemClicked, this);
      this.topTopicsMenu.itemHovered
        .remove(this.onTopTopicsItemHovered, this);
      this.topTopicsMenu.close();
      this.container.className = 'particles-menu';
    },

    updateYearAndColor: function(year, color) {
      this.currentColor = color;
      this.currentYear = year;
      this.areasMenu.updateYear(year);
      this.updateCountColor();
    },

    updateCountColor: function() {
      var items = this.container.getElementsByClassName('count');
      for (var i = 0; i < items.length; i++) {
        items[i].style.color = this.currentColor;
      }
    },

    setTopTopicsList: function(list) {
      this.topTopicsMenu.setList(list);
      this.updateCountColor();
    },

    selectAreaById: function(areaId) {
      this.areasMenu.selectByAreaId(areaId);
    },

    onAreasMenuItemSelected: function(areaId) {
      this.areaSelected.dispatch(areaId);
    },

    onTopTopicsItemClicked: function(selectedSprite, spriteList) {
      this.topicClicked.dispatch(selectedSprite, spriteList);
    },

    onTopTopicsItemHovered: function(selectedSprite, spriteList) {
      this.topicHovered.dispatch(selectedSprite, spriteList);
    }
  };

  app.views.space.particles.Menu = Menu;
})(window.sl.loom);
