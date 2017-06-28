(function(app) {
  'use strict';

  var DetailsGalleryHtml = function(title) {
    this.isOpen = false;

    this.container = document.createElement('div');
    this.container.className = 'topic-details-gallery';
    this.container.style.visibility = 'hidden';

    this.elTitle = document.createElement('div');
    this.elTitle.className = 'title';
    this.elTitle.style.visibility = 'hidden';
    this.elTitle.innerHTML = title;
    this.container.appendChild(this.elTitle);

    this.elYear = document.createElement('div');
    this.elYear.className = 'year';
    this.elYear.style.visibility = 'hidden';
    this.container.appendChild(this.elYear);

    this.elRecords = document.createElement('div');
    this.elRecords.className = 'heading';
    this.elRecords.style.visibility = 'hidden';
    this.elRecords.innerHTML = 'records with images';
    this.container.appendChild(this.elRecords);

    this.elTotal = document.createElement('div');
    this.elTotal.className = 'total';

    this.elTotal.style.visibility = 'hidden';
    this.container.appendChild(this.elTotal);

    document.body.appendChild(this.container);
  };

  DetailsGalleryHtml.prototype = {

    constructor: DetailsGalleryHtml,

    setTitle: function(title) {
      this.elTitle.innerHTML = title;
    },

    destroy: function() {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      document.body.removeChild(this.container);
      TweenMax.killTweensOf(this.container);
      TweenMax.killTweensOf(this.elRecords);
      TweenMax.killTweensOf(this.elTitle);
      TweenMax.killTweensOf(this.elTotal);
      TweenMax.killTweensOf(this.elYear);
      this.container = null;
      this.elRecords = null;
      this.elTitle = null;
      this.elTotal = null;
      this.elYear = null;
    },

    outro: function() {
      var time = 0.3;
      this.isOpen = false;
      TweenMax.killTweensOf(this.container);
      TweenMax.killTweensOf(this.elTitle);
      TweenMax.killTweensOf(this.elYear);
      TweenMax.killTweensOf(this.elRecords);
      TweenMax.killTweensOf(this.elTotal);

      TweenMax.to(this.container, time, {
        autoAlpha: 0, y: -260, ease: Back.easeIn, delay: 0.25
      });
      TweenMax.to(this.elTitle, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.2
      });
      TweenMax.to(this.elYear, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.15
      });
      TweenMax.to(this.elRecords, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.1
      });
      TweenMax.to(this.elTotal, time, {
        autoAlpha: 0, ease: Power2.easeIn
      });
    },

    intro: function() {
      this.isOpen = true;
      var time = 0.5;
      TweenMax.set(this.container, {y: this.y - 30});
      TweenMax.to(this.container, 0.6, {y: this.y,
        autoAlpha: 1, ease: Back.easeOut
      });
      TweenMax.to(this.elTitle, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.3
      });
      TweenMax.to(this.elYear, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.35
      });
      TweenMax.to(this.elRecords, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.4
      });
      TweenMax.to(this.elTotal, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.45
      });
    },

    update: function(imagesTotal, year) {
      var color = app.utils.ColorUtils.getColorByYear(year);
      this.elYear.style.color = color;
      this.elTotal.style.color = color;

      this.elYear.innerHTML = year + ' - ' + (year + app.models.configModel
        .gapYear - 1);

      if (imagesTotal < 10 && imagesTotal > 0) {
        this.elTotal.innerHTML = '0' + imagesTotal;
      } else {
        this.elTotal.innerHTML = imagesTotal;
      }
    }
  };

  app.views.space.details.DetailsGalleryHtml = DetailsGalleryHtml;
})(window.sl.loom);
