(function(classPath) {
  'use strict';

  var TopTopicsMenu = function(parentElement) {
    this.itemHovered = new signals.Signal();
    this.itemClicked = new signals.Signal();

    this.maxItemsNum = 10;
    this.list = [];
    this.container = document.createElement('div');
    this.container.className = 'top-topics';
    parentElement.appendChild(this.container);

    this.mouseOverBind = this.mouseOver.bind(this);
    this.clickBind = this.click.bind(this);

    var header = document.createElement('div');
    header.className = 'header';
    this.container.appendChild(header);

    var title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = 'Top 10 topics';
    header.appendChild(title);

    var label = document.createElement('div');
    label.className = 'subtitle';
    label.innerHTML = 'Records';
    header.appendChild(label);

    this.ul = document.createElement('ul');
    this.ul.addEventListener('click', this.clickBind, false);
    this.ul.addEventListener('mouseover', this.mouseOverBind, false);
    this.container.appendChild(this.ul);
  };

  TopTopicsMenu.prototype = {

    constructor: TopTopicsMenu,

    destroy: function() {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      this.itemHovered.dispose();
      this.ul.removeEventListener('click', this.mouseClick);
      this.ul.removeEventListener('mouseover', this.mouseOverBind);
      this.clickBind = null;
      this.container = null;
      this.list = null;
      this.itemHovered = null;
      this.mouseOverBind = null;
      this.ul = null;
    },

    close: function() {},

    open: function() {},

    mouseOver: function(event) {
      var id = this.getDatasetId(event.path);
      if (id) {
        this.itemHovered.dispatch(this.list[id].sprite, this.list);
      }
    },

    click: function(event) {
      var id = this.getDatasetId(event.path);
      if (id) {
        this.itemClicked.dispatch(this.list[id].sprite, this.list);
      }
    },

    getDatasetId: function(eventPath) {
      var item;
      var id;

      for (var i = 0; i < eventPath.length; i++) {
        item = eventPath[i];

        if (item.dataset.hasOwnProperty('id')) {
          // id found!
          id = item.dataset.id;
          break;
        }

        if (item.nodeName === 'UL') {
          break;
        }
      }
      return id;
    },

    setList: function(list) {
      var html = '';
      var l = Math.min(this.maxItemsNum, list.length);
      this.list = list.slice(0, l);

      for (var i = 0; i < l; i++) {
        html += '<li data-id="' + i + '"><span class="text">' +
          list[i].sprite.userData.key + '</span><span class="count">' +
          list[i].count + '</span></li>';
      }

      this.ul.innerHTML = html;
    }
  };

  classPath.TopTopicsMenu = TopTopicsMenu;
})(window.sl.loom.views.space.particles);
