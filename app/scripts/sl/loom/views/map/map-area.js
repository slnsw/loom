(function(app) {
  'use strict';

  // //////////////////////////////////////////////////////////////////////////
  // MapArea Class
  //
  // - Holds Area data
  // - Coeficients for Online and Offline for each Year Gap ( each 5 years )
  // - Has a 3d line for the highest vertex in the area
  // - Has a HTML Element with the Area's title and date
  // - has the top and bottom Uniforms to change the ShaderMaterial properties
  //
  // //////////////////////////////////////////////////////////////////////////

  var MapArea = function(index, maxElevation, data, camera, $dom) {
    this.maxItems = 650;
    this.comparisonMode = 'individual';

    this.recordsBtnClicked = new signals.Signal();

    this.bottomUniforms = null;
    this.camera = camera;
    this.color = data.color;
    this.data = data;
    this.$dom = $dom;
    this.height = 0;
    this.htmlLabel = new app.views.MapAreaLabel(index, data.name, '0');

    this.htmlLabel.recordsBtnClicked.add(this.onHtmlLabelRecordsBtnClick, this);

    this.index = index;
    this.maxElevation = maxElevation;
    this.offlineCoef = 0;
    this.onlineCoef = 0;
    this.peakPosition = new THREE.Vector3();
    this.topUniforms = null;
    this.verticeIndex = 0;
  };

  MapArea.prototype.getHtmlLabel = function() {
    return this.htmlLabel;
  };

  MapArea.prototype.onHtmlLabelRecordsBtnClick = function() {
    this.recordsBtnClicked.dispatch(this);
  };

  MapArea.prototype.updateImageCount = function(value) {
    this.htmlLabel.updateImageCount(value);
  };

  MapArea.prototype.updateDataByYear = function(year, yearIndex, hasRecords) {
    // there is no data for 2000 yet
    yearIndex = Math.min(this.data.coefs.length - 1, yearIndex);

    var coef = this.data.coefs[yearIndex];
    var perYear = this.data.count[yearIndex];

    var counterOn = perYear[0];
    var counterOff = perYear[1];
    var total = counterOff + counterOn;

    // using max items to compare the percent and calculate the elevation
    // this.updateOnlineCoef( counterOn / this.maxItems );
    // this.updateOfflineCoef( counterOff / this.maxItems );

    var offCoef = coef[0] * (counterOff / counterOn);

    // individual
    if (this.comparisonMode === 'individual') {
      this.updateOnlineCoef(coef[0]);
      this.updateOfflineCoef(offCoef);
    } else {
      // all areas
      this.updateOnlineCoef(coef[0]);
      this.updateOfflineCoef(offCoef);
    }

    this.htmlLabel.updateDetails(
      // year + ' &mdash; ' + ( year + 5 ),
      year,
      counterOn,
      total,
      hasRecords
    );
  };

  MapArea.prototype.updateOfflineCoef = function(value) {
    TweenMax.to(this, 0.2, {
      offlineCoef: value,
      ease: Power1.easeOut,
      onUpdate: this.onUpdateOfflineCoef,
      onUpdateScope: this
    });
  };

  MapArea.prototype.updateOnlineCoef = function(value) {
    TweenMax.to(this, 0.2, {
      onlineCoef: value,
      ease: Power1.easeOut,
      onUpdate: this.onUpdateOnlineCoef,
      onUpdateScope: this
    });
  };

  MapArea.prototype.onUpdateOnlineCoef = function() {
    var py = this.onlineCoef * this.maxElevation * (this.height / 255) + 32;
    this.topUniforms.colorCoefs.value[this.index] = this.onlineCoef;
    this.peakPosition.y = py;
    this.updateLabelPosition2D();
  };

  MapArea.prototype.onUpdateOfflineCoef = function() {
    this.bottomUniforms.colorCoefs.value[this.index] = this.offlineCoef;
  };

  MapArea.prototype.setColor = function(value) {
    this.htmlLabel.setColor(value);
  };

  MapArea.prototype.updateLabelPosition2D = function() {
    var pos = this.peakPosition.clone();
    pos.project(this.camera);

    var coords = {
      x: (pos.x + 1) * this.$dom.width() / 2,
      y: (-pos.y + 1) * this.$dom.height() / 2
    };
    this.htmlLabel.setPos(Math.round(coords.x), Math.round(coords.y));
  };

  MapArea.prototype.destroy = function() {
    this.recordsBtnClicked.removeAll();
    delete this.recordsBtnClicked;

    // destroy html element
    this.htmlLabel.destroy();
    delete this.htmlLabel;
    delete this.data;
    delete this.camera;
    delete this.maxElevation;
    delete this.bottomUniforms;
    delete this.color;
    delete this.height;
    delete this.index;
    delete this.peakPosition;
    delete this.offlineCoef;
    delete this.onlineCoef;
    delete this.topUniforms;
    delete this.verticeIndex;
    delete this.$dom;
  };

  MapArea.prototype.showLabel = function() {
    this.updateLabelPosition2D();
    this.htmlLabel.show();
  };

  MapArea.prototype.hideLabel = function() {
    this.htmlLabel.hide();
  };

  MapArea.prototype.hideDetails = function() {
    this.htmlLabel.hideDetails();
  };

  MapArea.prototype.showDetails = function() {
    this.htmlLabel.showDetails();
  };

  app.views.MapArea = MapArea;
})(window.sl.loom);
