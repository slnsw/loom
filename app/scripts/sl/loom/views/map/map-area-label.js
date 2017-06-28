(function(app) {
  'use strict';

  //
  // MapAreaLabel
  //
  // - MapArea controls this class.
  // - Represents one area of the Map.
  // - Create and manipulate a HTML Element.
  // - Position the HTML Element based on the highest vertex of the area.
  //
  var MapAreaLabel = function(index, title, year) {
    this.digitisedCount = 0;
    this.recordsBtnClicked = new signals.Signal();
    this.title = title;
    this.color = 0;
    this.year = year;
    this.state = 'init';
    this.width = 400;
    this.heightLabel = 73;
    this.heightDetails = 194;
    this.heightDetailsWithoutRecordsButton = 96;
    this.hasRecords = false;
    this.marginBottom = 20;
    this.pos = {
      x: 0,
      y: 0
    };

    var template = app.services.TemplateService.get('map-area-label.html')({
      title: title,
      id: 'label' + index
    });

    this.container = $(template)[0];
    this.elDate = this.container.getElementsByClassName('date')[0];
    this.elDetails = this.container.getElementsByClassName('details')[0];
    this.elTotalRecords = this.container.getElementsByClassName('t-records')[
      0];
    this.elDigitisedRecords = this.container.getElementsByClassName(
      'd-records')[0];
    this.elStatus = this.container.getElementsByClassName('d-status')[0];
    var statusBar = this.container.getElementsByClassName('d-status-bar')[0];
    this.elStatusBar = statusBar.getElementsByTagName('span')[0];

    this.recordsBtnShowing = false;
    this.recordsBtn = this.container.getElementsByClassName(
      'view-records-btn')[0];
    this.recordsBtnText = this.recordsBtn.getElementsByTagName('span')[0];
    this.recordsBtn.onclick = this.onRecordsBtnClick.bind(this);

    this.digitalRecords = this.container.getElementsByTagName('li')[0];
    this.digitalRecords.style.cursor = 'pointer';
    this.digitalRecords.onclick = this.onDigitalRecordsClick.bind(this);

    this.totalRecords = this.container.getElementsByTagName('li')[1];
    this.totalRecords.style.cursor = 'pointer';
    this.totalRecords.onclick = this.onTotalRecordsClick.bind(this);

    this.setDate(year);

    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  };

  MapAreaLabel.prototype.onRecordsBtnClick = function(event) {
    event.preventDefault();
    this.recordsBtnClicked.dispatch();
  };

  MapAreaLabel.prototype.onDigitalRecordsClick = function(event) {
    var url = 'http://acmssearch.sl.nsw.gov.au/s/search.html?';
    url += 'sort=metaz&sortby=dateasc&collection=slnsw';
    url += '&query_phrase=' + this.title;
    url += '&meta_d2=' + (this.year + 5);
    url += '&meta_d1=' + (this.year - 1);
    url += '&f.Access%7CG=yes';

    event.preventDefault();
    window.open(url);
  };

  MapAreaLabel.prototype.onTotalRecordsClick = function(event) {
    var url = 'http://acmssearch.sl.nsw.gov.au/s/search.html?';
    url += 'sort=metaz&sortby=dateasc&collection=slnsw';
    url += '&query_phrase=' + this.title;
    url += '&meta_d2=' + (this.year + 5);
    url += '&meta_d1=' + (this.year - 1);
    event.preventDefault();
    window.open(url);
  };

  MapAreaLabel.prototype.updateImageCount = function(value) {
    var txt = (value > 1) ? 'View Images' : 'View Image';
    txt += ' ( ' + value + ' / ' + this.digitisedCount + ' )';
    this.recordsBtnText.textContent = txt;
  };

  MapAreaLabel.prototype.setDate = function(value) {
    this.year = value;
    this.elDate.innerHTML = value + ' &mdash; ' + (value + 5);
  };

  MapAreaLabel.prototype.setColor = function(value) {
    this.color = value;

    // only update the html elements color if is visible and showing details
    if (this.state === 'show-details') {
      this.updateElementsColor();
    }
  };

  MapAreaLabel.prototype.updateElementsColor = function() {
    this.elDate.style.color = this.color;
    this.elTotalRecords.style.color = this.color;
    this.elDigitisedRecords.style.color = this.color;
    this.elStatus.style.color = this.color;
    this.elStatusBar.style.backgroundColor = this.color;
    this.container.style.borderLeftColor = this.color;
  };

  MapAreaLabel.prototype.tweenPosition = function(x, y, time) {
    y = this.checkYLimit(y);
    TweenMax.to(this.pos, time, {
      x: x,
      y: y,
      onUpdate: this.updatePosition,
      onUpdateScope: this,
      onComplete: this.updatePosition,
      onCompleteScope: this
    });
  };

  MapAreaLabel.prototype.checkYLimit = function(y) {
    var limity = 100;
    if (this.recordsBtnShowing) {
      limity += this.heightDetails;
    } else {
      limity += this.heightDetailsWithoutRecordsButton;
    }

    return Math.max(limity, y);
  };

  MapAreaLabel.prototype.setPos = function(x, y) {
    // dont need to update the html if the position is the same
    if (x !== this.pos.x) {
      this.pos.x = x;
      this.container.style.left = x + 'px';
    }

    // dont need to update the html if the position is the same
    if (y !== this.pos.y) {
      // main nav height is 80px and the default space between elements is 20px
      // lets limit the position Y so the label dont overlap the main nav
      y = this.checkYLimit(y);
      this.pos.y = y;
      this.container.style.top = y + 'px';
    }
  };

  MapAreaLabel.prototype.updatePosition = function() {
    this.container.style.left = this.pos.x + 'px';
    this.container.style.top = this.pos.y + 'px';
  };

  MapAreaLabel.prototype.updateDetails = function(date, digitisedCount,
    totalCount, hasRecords) {
    this.digitisedCount = digitisedCount;
    this.hasRecords = hasRecords;
    this.setDate(date);
    this.elDigitisedRecords.textContent = digitisedCount;
    this.elTotalRecords.textContent = totalCount;
    this.elStatus.textContent = Math.round(digitisedCount / totalCount *
      100) + '%';
    this.elStatusBar.style.width = Math.round(digitisedCount / totalCount *
      100) + '%';

    if (this.state === 'show-details') {
      if (this.hasRecords) {
        this.showRecordsBtn();
      } else {
        this.hideRecordsBtn();
      }
    }
  };

  MapAreaLabel.prototype.hide = function() {
    if (this.state !== 'hide') {
      this.state = 'hide';
      var this_ = this;
      TweenMax.to(this.container, 0.2, {
        autoAlpha: 0,
        ease: Power2.easeIn,
        onComplete: function() {
          this_.container.style.display = 'none';
        }
      });
      TweenMax.to(this.container, 0.2, {
        height: 0,
        y: -this.marginBottom,
        ease: Power2.easeIn
      });
    }
  };

  MapAreaLabel.prototype.show = function() {
    if (this.state !== 'show') {
      this.state = 'show';
      this.updateElementsColor();
      this.container.style.pointerEvents = 'none';
      this.container.style.display = 'block';
      this.elDetails.style.display = 'none';
      this.elDetails.style.visibility = 'hidden';
      this.elDetails.style.opacity = 0;
      TweenMax.set(this.container, {
        y: -this.marginBottom,
        height: 0
      });
      TweenMax.to(this.container, 0.4, {
        autoAlpha: 1,
        height: this.heightLabel,
        y: -this.heightLabel - this.marginBottom,
        ease: Power2.easeOut
      });
    }
  };

  MapAreaLabel.prototype.hideDetails = function() {
    if (this.state !== 'hide-details') {
      var this_ = this;
      this.state = 'hide-details';
      this.container.style.pointerEvents = 'none';
      this.recordsBtnShowing = false;

      TweenMax.to(this.elDetails, 0.2, {
        autoAlpha: 0,
        ease: Power2.easeOut,
        onComplete: function() {
          this_.elDetails.style.display = 'none';
        }
      });

      TweenMax.to(this.container, 0.2, {
        height: this.heightLabel,
        y: -this.heightLabel - this.marginBottom,
        ease: Power2.easeOut
      });
    }
  };

  MapAreaLabel.prototype.showDetails = function() {
    if (this.state !== 'show-details') {
      var height = this.heightDetails;

      if (!this.hasRecords) {
        height = this.heightDetailsWithoutRecordsButton;
      }

      this.state = 'show-details';
      this.container.style.pointerEvents = 'auto';
      this.elDetails.style.display = 'block';
      this.recordsBtnShowing = this.hasRecords;

      TweenMax.to(this.elDetails, 0.4, {
        autoAlpha: 1,
        ease: Power2.easeInOut
      });

      TweenMax.to(this.container, 0.4, {
        height: height,
        y: -height - this.marginBottom,
        ease: Power2.easeInOut
      });
    }
  };

  MapAreaLabel.prototype.showRecordsBtn = function() {
    if (!this.recordsBtnShowing) {
      this.recordsBtnShowing = true;

      TweenMax.to(this.recordsBtn, 0.2, {
        autoAlpha: 1,
        ease: Power2.easeInOut
      });

      TweenMax.to(this.container, 0.3, {
        height: this.heightDetails,
        y: -this.heightDetails - this.marginBottom,
        ease: Power2.easeInOut
      });
    }
  };

  MapAreaLabel.prototype.hideRecordsBtn = function() {
    if (this.recordsBtnShowing) {
      this.recordsBtnShowing = false;

      TweenMax.to(this.recordsBtn, 0.2, {
        autoAlpha: 0,
        ease: Power2.easeOut
      });

      TweenMax.to(this.container, 0.3, {
        height: this.heightDetailsWithoutRecordsButton,
        y: -this.heightDetailsWithoutRecordsButton - this.marginBottom,
        ease: Power2.easeInOut
      });
    }
  };

  MapAreaLabel.prototype.destroy = function() {
    TweenMax.killTweensOf(this.container);
    TweenMax.killTweensOf(this.elDetails);

    document.body.removeChild(this.container);

    this.recordsBtn.onclick = null;
    this.recordsBtnClicked.removeAll();

    this.digitalRecords.onclick = null;
    this.totalRecords.onclick = null;

    delete this.recordsBtn;
    delete this.digitalRecords;
    delete this.totalRecords;
    delete this.recordsBtnClicked;
    delete this.pos;
    delete this.container;
    delete this.elTitle;
    delete this.elDate;
    delete this.elDetails;
    delete this.elTotalRecords;
    delete this.elDigitisedRecords;
    delete this.elStatus;
    delete this.elStatusBar;
  };

  app.views.MapAreaLabel = MapAreaLabel;
})(window.sl.loom);
