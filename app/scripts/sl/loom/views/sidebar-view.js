(function(app) {
  'use strict';

  var TABS = [
    'data',
    'about',
    'makers',
    'views'
    ];

  var tabContainer = [];

  var SideBarView = function() {
    var template = app.services.TemplateService.get('sidebar.html')();
    this.container = $(template);

    $(document.body).append(this.container);

    this.tabs = newTabView();
    var $tunnelBtn = $('.tunnel-btn');
    var $favBtn = $('.fav-btn');
    var $mapBtn = $('.map-btn');
    var $spaceBtn = $('.space-btn');

    app.utils.SVGUtils.loadSvg('nav-icon-map.svg', $mapBtn);
    app.utils.SVGUtils.loadSvg('nav-icon-tunnel.svg', $tunnelBtn);
    app.utils.SVGUtils.loadSvg('nav-icon-fav.svg', $favBtn);
    app.utils.SVGUtils.loadSvg('nav-icon-space.svg', $spaceBtn);
  };

  SideBarView.prototype = {

    constructor: SideBarView,

    show: function() {
      this.container.removeClass('hidden');
      this.container.addClass('collapsed');
    },

    hide: function() {
      this.container.addClass('hidden');
    },

    collapse: function() {
      this.container.addClass('collapsed');
    }
  };

  function newTabView() {
    var tpl;

    for (var i = 0; i < TABS.length; i++) {

      tpl = 'sidebar-' + TABS[i] + '.html';
      var tabTemplate = app.services.TemplateService.get(tpl)();

      tabContainer[i] = $(tabTemplate);
      tabContainer[i].addClass('collapsed');
      tabContainer[i].attr('index', i);

      tabContainer[i].on('click', onTabClick);

      $('.sidebarContainer').append(tabContainer[i]);
    }
    $(window).on('click', onWindowClick);
  }

  function onTabClick(e) {

    // var ele = e.currentTarget.className;
    var ele = $(e.currentTarget);
    var j;
    if (ele.hasClass('collapsed')) {
      for (j = ele.attr('index'); j < tabContainer.length; j++) {
        tabContainer[j].removeClass('collapsed');
        tabContainer[j].removeClass('active');
      }
      ele.addClass('active');

    } else if (ele.hasClass('active')) {
      $('.tabs').addClass('collapsed');
      ele.removeClass('active');
    } else {

      for (j = 0; j < tabContainer.length; j++) {
        if (!tabContainer[j].hasClass('collapsed') &&
            (tabContainer[j].attr('index') >= ele.attr('index'))) {
          tabContainer[j].removeClass('collapsed');
          ele.addClass('active');

        } else if (!tabContainer[j].hasClass('collapsed') &&
            (tabContainer[j].attr('index') <= ele.attr('index'))) {
          tabContainer[j].addClass('collapsed');
          tabContainer[j].removeClass('active');
          ele.addClass('active');
        }
      }
    }
  }

  function onWindowClick(e) {
    var sidebarEl = $('.sidebar');

    if (!sidebarEl.is(e.target) && sidebarEl.has(e.target).length === 0) {
      $('.tabs').addClass('collapsed');
      $('.tabs').removeClass('active');
    }
  }

  app.views.SideBarView = SideBarView;
})(window.sl.loom);
