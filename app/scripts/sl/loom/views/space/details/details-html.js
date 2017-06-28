(function(app) {
  'use strict';

  var DetailsHtml = function() {
    this.isOpen = false;
    this.year = 0;
    this.y = 0;
    this.container = document.createElement('div');
    this.container.className = 'topic-details';
    this.container.style.visibility = 'hidden';

    this.elTitle = document.createElement('div');
    this.elTitle.className = 'title';
    this.elTitle.style.visibility = 'hidden';
    this.container.appendChild(this.elTitle);

    this.elYear = document.createElement('div');
    this.elYear.className = 'year';
    this.elYear.style.visibility = 'hidden';
    this.container.appendChild(this.elYear);

    this.containerRecords = document.createElement('div');
    this.containerRecords.className = 'records-col';
    this.container.appendChild(this.containerRecords);
    this.elRecords = document.createElement('div');
    this.elRecords.className = 'heading';
    this.elRecords.style.visibility = 'hidden';
    this.elRecords.innerHTML = 'records';
    this.containerRecords.appendChild(this.elRecords);

    this.elTotalRecords = document.createElement('div');
    this.elTotalRecords.className = 'total';
    this.elTotalRecords.style.visibility = 'hidden';
    this.containerRecords.appendChild(this.elTotalRecords);

    this.containerImages = document.createElement('div');
    this.containerImages.className = 'images-col';
    this.container.appendChild(this.containerImages);

    this.elImages = document.createElement('div');
    this.elImages.className = 'heading';
    this.elImages.style.visibility = 'hidden';
    this.elImages.innerHTML = 'records with images';
    this.containerImages.appendChild(this.elImages);

    this.elTotalImages = document.createElement('div');
    this.elTotalImages.className = 'total-images total';
    this.elTotalImages.style.visibility = 'hidden';
    this.containerImages.appendChild(this.elTotalImages);

    // We have two bits of info:
    // Record: 123   |  Records with images: 03
    // Then button says 'View 3 images'
    //
    // Then when you are on the Image page it can say
    // "Records with images: 03"

    this.galleryButton = document.createElement('a');
    this.galleryButton.className = 'view-records-btn';
    var btn = '<span>View Images</span>' +
    '<svg width="26" height="15" viewPort="0 0 26 15" version="1.1"' +
    'xmlns="http://www.w3.org/2000/svg">' +
    '<line x1="17" y1="0" x2="26" y2="7.5" stroke="white"' +
    ' stroke-width="1" />' +
    '<line x1="17" y1="15" x2="26" y2="7.5" stroke="white"' +
    ' stroke-width="1" />' +
    '<line x1="0" y1="7.5" x2="25" y2="7.5" stroke="white"' +
    ' stroke-width="1" />' +
    '</svg>';
    this.galleryButton.innerHTML = btn;
    this.galleryButton.style.visibility = 'hidden';
    this.usingGalleryButton = false;
    this.container.appendChild(this.galleryButton);
    this.galleryButtonClickBind = this.onGalleryButtonClick.bind(this);
    this.galleryButton.addEventListener('click',
      this.galleryButtonClickBind);

    this.galleryButtonLabel = this.galleryButton
      .getElementsByTagName('span')[0];

    this.galleryButtonClicked = new signals.Signal();

    document.body.appendChild(this.container);
  };

  DetailsHtml.prototype = {

    constructor: DetailsHtml,

    destroy: function() {
      this.galleryButtonClicked.dispose();
      this.galleryButtonClicked = null;
      this.galleryButton.removeEventListener('click',
        this.galleryButtonClickBind);
      this.galleryButtonClickBind = null;
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      document.body.removeChild(this.container);
      TweenMax.killTweensOf(this.container);
      TweenMax.killTweensOf(this.elRecords);
      TweenMax.killTweensOf(this.elTitle);
      TweenMax.killTweensOf(this.elRecords);
      TweenMax.killTweensOf(this.elTotalRecords);
      TweenMax.killTweensOf(this.elImages);
      TweenMax.killTweensOf(this.elTotalImages);
      TweenMax.killTweensOf(this.elYear);
      TweenMax.killTweensOf(this.galleryButton);
      this.container = null;
      this.elImages = null;
      this.elRecords = null;
      this.elTitle = null;
      this.elTotalImages = null;
      this.elTotalRecords = null;
      this.elYear = null;
      this.galleryButton = null;
    },

    onGalleryButtonClick: function(event) {
      event.preventDefault();
      this.galleryButtonClicked.dispatch();
    },

    setTitle: function(value) {
      this.elTitle.innerHTML = value;
    },

    setTotal: function(value) {
      if (!value) {
        value = 0;
      }
      if (value < 10 && value > 0) {
        this.elTotalRecords.innerHTML = '0' + value;
      } else {
        this.elTotalRecords.innerHTML = value;
      }
    },

    setYear: function(value) {
      this.year = value;
      this.elYear.innerHTML = value + ' - ' + (value + app.models.configModel
        .gapYear - 1);
      this.updateColors();
    },

    useGalleryButton: function(value) {
      if (this.isOpen) {
        TweenMax.to(this.galleryButton, 0.3, {autoAlpha: value ? 1 : 0});
      } else {
        TweenMax.set(this.galleryButton, {autoAlpha: value ? 1 : 0});
      }
      this.usingGalleryButton = value;
    },

    setImagesTotal: function(count) {
      var label = 'View ';

      if (!count) {
        count = 0;
      }

      if (count < 10 && count > 0) {
        this.elTotalImages.innerHTML = '0' + count;
      } else {
        this.elTotalImages.innerHTML = count;
      }

      if (count === 0) {
        this.useGalleryButton(false);
        return;
      } else if (count === 1) {
        label += '1 Image';
      } else if (count < 20) {
        label += count + ' Images';
      } else {
        label += '20 of ' + count + ' Images';
      }
      this.galleryButtonLabel.innerHTML = label;
      this.useGalleryButton(true);
    },

    close: function() {
      var time = 0.3;
      this.isOpen = false;
      TweenMax.killTweensOf(this.container);
      TweenMax.killTweensOf(this.elTitle);
      TweenMax.killTweensOf(this.elYear);
      TweenMax.killTweensOf(this.elRecords);
      TweenMax.killTweensOf(this.elTotalRecords);
      TweenMax.killTweensOf(this.galleryButton);

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
      TweenMax.to(this.elTotalRecords, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.05
      });
      TweenMax.to(this.elImages, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.1
      });
      TweenMax.to(this.elTotalImages, time, {
        autoAlpha: 0, ease: Power2.easeIn, delay: 0.05
      });
      TweenMax.to(this.galleryButtonClicked, time, {
        autoAlpha: 0, ease: Power2.easeIn
      });
    },

    open: function() {
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
      TweenMax.to(this.elTotalRecords, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.45
      });
      TweenMax.to(this.elImages, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.5
      });
      TweenMax.to(this.elTotalImages, time, {
        autoAlpha: 1, ease: Power1.easeOut, delay: 0.55
      });
      if (this.usingGalleryButton) {
        TweenMax.to(this.galleryButton, time, {
          autoAlpha: 1, ease: Power1.easeOut, delay: 0.6
        });
      }
    },

    setOffsetY: function(particleFinalScale) {
      var offsetY = Math.max(10, particleFinalScale * 0.8);
      var ease;
      var minHeight = 70;
      var maxHeight = 200;
      var wh = document.body.clientHeight / 2 - 100; // 100 is the nav height
      var diff = (wh - offsetY);
      var h;

      if (diff > maxHeight) {
        h = maxHeight;
      } else {
        h = Math.max(minHeight, diff);
      }

      if (offsetY + h > wh) {
        offsetY = wh - h;
      }

      ease = (offsetY > this.offsetY) ? Power2.easeOut : Power2.easeInOut;
      this.offsetY = Math.ceil(offsetY);
      // the final y needs to be negative so we need to remove the height
      this.y = -h - this.offsetY;

      if (this.isOpen) {
        // animate only if it is opened
        // kill the Y property so it not conflicts with the open animation
        TweenMax.killTweensOf(this.container, {y: true});
        TweenMax.to(this.container, 0.3, {
          y: -h - this.offsetY,
          height: h,
          ease: ease
        });
      }
    },

    updateColors: function() {
      var color = app.utils.ColorUtils.getColorByYear(this.year);
      this.elYear.style.color = color;
      this.elTotalRecords.style.color = color;
      this.elTotalImages.style.color = color;
      this.container.style.borderLeftColor = color;
    }
  };

  app.views.space.details.DetailsHtml = DetailsHtml;
})(window.sl.loom);
