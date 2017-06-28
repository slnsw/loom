(function(app) {
  'use strict';

  var DetailsLocationsHtml = function() {
    this.itemSelected = new signals.Signal();

    this.countElementsList = [];
    this.currentAreaId = '';
    this.elementsDict = {};
    this.list = [];
    this.selected = null;
    this.year = 0;
    this.offsetY = 0;
    this.paddingTop = 0;
    this.clickBind = this.click.bind(this);
    this.opened = false;
    this.ulHeight = 0;

    this.container = document.createElement('div');
    this.container.className = 'topic-details-locations';
    this.container.style.visibility = 'hidden';

    this.title = document.createElement('div');
    this.title.className = 'heading';
    this.title.innerHTML = 'Locations';
    this.container.appendChild(this.title);

    this.ul = document.createElement('ul');
    this.container.appendChild(this.ul);

    document.body.appendChild(this.container);

    this.container.addEventListener('click', this.clickBind, false);
  };

  DetailsLocationsHtml.prototype = {

    constructor: DetailsLocationsHtml,

    destroy: function() {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      for (var p in this.elementsDict) {
        if (this.elementsDict.hasOwnProperty(p)) {
          delete this.elementsDict[p];
        }
      }

      this.container.removeEventListener('click', this.clickBind);
      document.body.removeChild(this.container);
      TweenMax.killTweensOf(this.container);
      this.itemSelected.dispose();

      this.clickBind = null;
      this.container = null;
      this.countElementsList = null;
      this.currentAreaId = null;
      this.elementsDict = null;
      this.elementsDict = null;
      this.itemSelected = null;
      this.list = null;
      this.selected = null;
      this.title = null;
      this.ul = null;
    },

    /**
     * list : Array of Array
     * ex: [['darling harbour', 23], ['the rocks', 117]]
     *
     * @param  {Array} list - List of locations
     */
    update: function(list) {
      var html = '';
      var area;
      var areaName;
      var i;

      for (i = 0; i < list.length; i++) {
        area = list[i];

        if (area.count > 0 || this.currentAreaId === area.id ||
          areaName === 'all') {
          html += '<li data-id="' + area.id + '"';

          if (this.currentAreaId === area.id) {
            html += ' class="selected"';
          }

          html += '><span class="title">' + area.name + '</span>' +
          '<span class="count">' + area.count + '</span></li>';
        }
      }

      this.ul.innerHTML = html;

      this.list = list;
      var elements = this.container.getElementsByTagName('li');
      this.countElementsList = this.container.getElementsByClassName('count');

      this.elementsDict = {};

      for (i = 0; i < elements.length; i++) {
        this.elementsDict[elements[i].dataset.id] = elements[i];
        if (elements[i].dataset.id === this.currentAreaId) {
          this.selected = elements[i];
        }
      }
    },

    close: function() {
      this.itemSelected.removeAll();
      TweenMax.killTweensOf(this.container);
      TweenMax.to(this.container, 0.4, {
        y: 60,
        autoAlpha: 0,
        ease: Back.easeIn
      });
      this.opened = false;
    },

    open: function() {
      this.opened = true;
      TweenMax.set(this.container, {
        y: this.offsetY + 30,
        paddingTop: this.paddingTop
      });
      TweenMax.to(this.container, 0.6, {
        y: this.offsetY,
        paddingTop: this.paddingTop,
        autoAlpha: 1, ease: Back.easeOut, delay: 0.1
      });

      var list = this.container.getElementsByTagName('li');

      var delay = 0.5;
      for (var i = list.length - 1; i >= 0; i--) {
        TweenMax.set(list[i], {autoAlpha: 0});
        TweenMax.to(list[i], 0.2, {
          autoAlpha: 1, ease: Power2.easeOut, delay: delay
        });
        delay += 0.025;
      }

      TweenMax.set(this.title, {autoAlpha: 0});
      TweenMax.to(this.title, 0.2, {
        autoAlpha: 1, ease: Power2.easeOut, delay: delay
      });
    },

    click: function(event) {
      var item;

      for (var i = 0; i < event.path.length; i++) {
        item = event.path[i];

        if (item.dataset.hasOwnProperty('id')) {
          // id found!
          this.itemSelected.dispatch(item.dataset.id);
        }

        if (item.nodeName === 'UL') {
          break;
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
    },

    setYear: function(value) {
      this.year = value;
      this.updateColors();
    },

    setOffsetY: function(particleFinalScale) {
      var offsetY = Math.max(10, Math.ceil(particleFinalScale * 0.8));
      var ease = (offsetY > this.offsetY) ? Power2.easeOut : Power2.easeInOut;
      var listHeight = this.ul.offsetHeight;
      var titleHeight = this.title.offsetHeight;
      var h = listHeight + titleHeight;
      var maxPaddingTop = 100;
      var minPaddingTop = 20;
      var wh = document.body.clientHeight / 2 - 120; // 120 is the bottom slider height
      var paddingTop;
      var diff = (wh - offsetY - h);

      if (diff >= maxPaddingTop) {
        paddingTop = maxPaddingTop;
      } else {
        paddingTop = Math.max(minPaddingTop, diff);
      }

      if (offsetY + h + paddingTop > wh) {
        offsetY = wh - h - paddingTop;
      }

      this.offsetY = Math.ceil(offsetY);
      this.paddingTop = paddingTop;

      if (this.opened) {
        TweenMax.killTweensOf(this.container, {paddingTop: true, y: true});
        TweenMax.to(this.container, 0.3, {
          y: this.offsetY,
          paddingTop: this.paddingTop,
          ease: ease
        });
      }
    },

    updateColors: function() {
      var color = app.utils.ColorUtils.getColorByYear(this.year);
      for (var i = 0; i < this.countElementsList.length; i++) {
        this.countElementsList[i].style.color = color;
      }
      this.container.style.borderLeftColor = color;
    }

  };

  app.views.space.details.DetailsLocationsHtml = DetailsLocationsHtml;
})(window.sl.loom);
