(function(classPath) {
  'use strict';

  var AreasMenu = function(parentElement) {
    this.itemSelected = new signals.Signal();
    this.container = document.createElement('div');
    this.container.className = 'areas-menu';
    parentElement.appendChild(this.container);
    this.clickBind = this.click.bind(this);
    this.container.addEventListener('click', this.clickBind, false);

    var header = document.createElement('div');
    header.className = 'header';
    this.container.appendChild(header);

    var title = document.createElement('div');
    title.className = 'title';
    title.innerHTML = 'Locations';
    header.appendChild(title);

    var label = document.createElement('div');
    label.className = 'subtitle';
    label.innerHTML = 'Topics';
    header.appendChild(label);

    this.areasDict = {};
    this.areaIdList = [];
    this.selected = null;
    this.elementsDict = {};
    this.currentAreaId = 'all';
  };

  AreasMenu.prototype = {

    constructor: AreasMenu,

    destroy: function() {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      this.itemSelected.dispose();
      this.container.removeEventListener('click', this.clickBind);

      this.areaIdList = null;
      this.areasDict = null;
      this.clickBind = null;
      this.container = null;
      this.currentAreaId = null;
      this.elementsDict = null;
      this.itemSelected = null;
      this.selected = null;
    },

    close: function() {
      this.itemSelected.removeAll();
      // this.container.style.display = 'none';
    },

    open: function() {
      // this.container.style.display = 'block';
    },

    click: function(event) {
      var item;

      for (var i = 0; i < event.path.length; i++) {
        item = event.path[i];

        if (item.nodeName !== 'LI') {
          continue;
          // break;
        }

        if (item.dataset.hasOwnProperty('id')) {
          // id found!
          this.itemSelected.dispatch(item.dataset.id);
          break;
        }
      }
    },

    updateYear: function(year) {
      // need to implement another workaround, this is not the best approach
      if (year === 2000) {
        year = 1995;
      }

      for (var i = 0; i < this.areaIdList.length; i++) {
        var el = this.elementsDict[this.areaIdList[i]];
        var count = el.getElementsByClassName('count')[0];
        count.innerHTML = this.areasDict[this.areaIdList[i]].counts[year];
      }
    },

    setList: function(list) {
      var i;
      var itemsStr = '';
      var l = list.length;
      this.areaIdList = [];

      // sort objects by id
      list.sort(function(a, b) {
        if (a.id > b.id) {
          return 1;
        } else if (a.id < b.id) {
          return -1;
        }
        return 0;
      });

      var area;
      for (i = 0; i < l; i++) {
        area = list[i];

        this.areasDict[area.id] = area;

        // areaName = areaId.replace(/_/gi, ' ');
        itemsStr += '<li data-id="' + area.id + '"';
        if (area.id === this.currentAreaId) {
          itemsStr += ' class="selected"';
        }
        itemsStr += '><span class="chk"><span class="dot"></span></span>' +
          area.name + '<span class="count">' + area.counts + '</span></li>';
        // this.areaIdList.push(list[i]);
        this.areaIdList.push(area.id);
      }

      var ul = document.createElement('ul');
      ul.innerHTML = itemsStr;

      this.container.appendChild(ul);

      var elements = this.container.getElementsByTagName('li');
      this.elementsDict = {};

      for (i = 0; i < elements.length; i++) {
        this.elementsDict[elements[i].dataset.id] = elements[i];
        if (elements[i].dataset.id === this.currentAreaId) {
          this.selected = elements[i];
        }
      }
    },

    selectByAreaId: function(areaId) {
      this.currentAreaId = areaId;

      if (this.selected) {
        var old = this.selected;
        old.className = '';
      }

      if (this.elementsDict.hasOwnProperty(areaId)) {
        this.selected = this.elementsDict[areaId];
        this.selected.className = 'selected';
      }
    }
  };

  classPath.AreasMenu = AreasMenu;
})(window.sl.loom.views.space.particles);
