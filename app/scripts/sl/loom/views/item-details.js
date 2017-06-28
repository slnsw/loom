(function(app) {
  'use strict';

  var ItemDetails = function(data) {
    this.layoutHorizontalMinWidth = 720;
    this.width = 400; // 360 + 20 left  20 right padding
    this.left = 0;
    this.y = 0;
    this.tagClicked = new signals.Signal();
    // for favourite use
    this.docNum = data.docNum;
    var params = {
      area: app.utils.tagToText(data.area),
      don: data.don,
      imageUrl: data.imageUrl,
      itemLink: app.models.configModel.acmsItemUrl + data.itemId,
      tags: '',
      title: data.title,
      year: data.year
    };

    var tagText;
    var str = '<ul>';
    for (var i = 0; i < data.tags.length; i++) {
      tagText = data.tags[i];
      str += '<li class="tag">' + tagText + '</li>';
    }

    str += '</ul>';
    params.tags = str;

    this.elBody = $(document.body);
    this.templateParams = params;
  };

  ItemDetails.prototype = {

    constructor: ItemDetails,

    destroy: function() {
      TweenMax.killTweensOf(this.container);
      TweenMax.killTweensOf(this.favMessage);

      clearTimeout(this.timeoutFavouriteMessage);

      this.container.remove();
      this.container = null;
      this.elBody = null;
      this.favBtn.off('click');
      this.favBtn = null;
      this.tagClicked.dispose();
      this.tagClicked = null;
      this.data = null;
    },

    setup: function(layout) {
      var templateStr = 'item-details';
      var template;
      this.layout = layout;

      if (layout === 'horizontal') {
        templateStr += '-horizontal';
      }

      templateStr += '.html';

      template = app.services.TemplateService.get(templateStr)(
        this.templateParams);
      this.container = $(template);

      // change the link color to mach the current year color.
      var $don = this.container.find('.don a');
      var color = app.utils.ColorUtils.getColorByYear(this.templateParams.year);

      $don.find('.arrow .l').css('border-color', color);
      $don.find('.arrow .t').css('border-left-color', color);
      $don.css('color', color);
      this.container.find('.year').css('color', color);

      this.container.find('li').on('click', this.onTagClick.bind(this));

      this.favoritesService = new app.services.FavoritesService();
      this.favBtn = this.container.find('.fav-btn');
      this.favBtn.on('click', this.onFavButtonClick.bind(this));
      this.favMessage = this.container.find('.fav-msg');

      TweenMax.set(this.favMessage, {
        autoAlpha: 0
      });

      if (this.favoritesService.isFavorite(this.docNum)) {
        this.favBtn.addClass('selected');
      }
    },

    intro: function(itemViewWidth, itemViewHeight) {
      if (this.layout === 'horizontal') {
        // item-details in horizontal mode cant be smaller than 720
        this.itemViewWidth = Math.max(itemViewWidth,
          this.layoutHorizontalMinWidth);
      } else {
        this.itemViewWidth = itemViewWidth;
      }
      this.itemViewHeight = itemViewHeight;
      this.calculatePosition();

      this.elBody.append(this.container);
      this.elBody.addClass('enable-scroll');

      if (this.layout === 'horizontal') {
        this.container.width(itemViewWidth);
        TweenMax.fromTo(this.container, 0.5, {
          left: this.left,
          y: document.body.clientHeight
        }, {
          left: this.left,
          y: this.y,
          ease: Circ.easeOut
        });
      } else {
        TweenMax.fromTo(this.container, 0.5, {
          left: document.body.clientWidth,
          y: this.y
        }, {
          left: this.left,
          y: this.y,
          ease: Circ.easeOut
        });
      }
    },

    outro: function() {
      this.elBody.removeClass('enable-scroll');
      if (this.layout === 'horizontal') {
        TweenMax.to(this.container, 0.5, {
          top: document.body.clientHeight,
          ease: Circ.easeInOut
        });
      } else {
        TweenMax.to(this.container, 0.5, {
          left: document.body.clientWidth,
          ease: Circ.easeInOut
        });
      }
    },

    resize: function() {
      this.calculatePosition();
      TweenMax.set(this.container, {
        left: this.left,
        y: this.y
      });
    },

    onFavButtonClick: function(event) {
      event.preventDefault();
      if (this.favoritesService.toggle(this.docNum)) {
        this.favBtn.addClass('selected');
        this.showMessage('Added to favourites');
      } else {
        this.favBtn.removeClass('selected');
        this.showMessage('Removed from favourites');
      }
    },

    onTagClick: function(e) {
      var tagName = e.target.innerHTML;
      e.preventDefault();
      this.tagClicked.dispatch(tagName);
    },

    showMessage: function(message) {
      this.favMessage.text(message);
      TweenMax.set(this.favMessage, {
        autoAlpha: 0,
        marginLeft: 40
      });
      TweenMax.to(this.favMessage, 0.3, {
        autoAlpha: 1,
        marginLeft: 20,
        ease: Power2.easeOut
      });
      clearTimeout(this.timeoutFavouriteMessage);
      this.timeoutFavouriteMessage = setTimeout(this.hideMessage.bind(
        this), 2000);
    },

    hideMessage: function() {
      TweenMax.to(this.favMessage, 0.2, {
        autoAlpha: 0,
        marginLeft: 40,
        ease: Power2.easeInOut
      });
      clearTimeout(this.timeoutFavouriteMessage);
    },

    calculatePosition: function() {
      var space = 20; // space usind in css
      // lef tis 50%
      var ww = Math.max(document.body.clientWidth, 1024);
      var x;
      var y;

      if (this.layout === 'vertical') {
        x = (ww - this.itemViewWidth - this.width) * 0.5 + this.itemViewWidth;
        y = -this.itemViewHeight * 0.5 - space;
      } else {
        x = (ww - this.itemViewWidth) * 0.5;
        y = this.itemViewHeight * 0.5;
      }

      this.left = Math.round(x);
      this.y = Math.round(y);
    }
  };

  app.views.ItemDetails = ItemDetails;
})(window.sl.loom);
