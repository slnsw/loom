(function(app, config) {
  'use strict';

  app.views.MapView = function(webglView, model) {
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();

    var controller;
    var htmlLabel;
    var itemView;
    var map3d;
    var recordsGallery;
    var sliderYear;

    return {
      destroy: destroy,
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      render: render,
      resize: resize,
      setController: setController,
      setSliderYear: setSliderYear
    };

    // Public Methods

    function setController(value) {
      controller = value;
    }

    function setSliderYear(value) {
      sliderYear = value;
    }

    function intro() {
      model.yearChanged.add(modelYearChanged);
      map3d = new app.views.map.Map3d(webglView, model);
      map3d.areaRecordsClicked.add(onMap3dAreaRecordsClick);
      map3d.introCompleted.add(map3dIntroCompleted);
      map3d.intro();
    }

    function outro() {
      model.yearChanged.remove(modelYearChanged);
      // sliderYear.outro();
      map3d.outroCompleted.addOnce(outroCompleted.dispatch);

      if (recordsGallery) {
        recordsGallery.outroCompleted.remove(onRecordsGalleryOutroComplete);
      }

      if (itemView) {
        recordsGallery.disableItemsNav();
        // need to put the camera.position.Y back to 0;
        recordsGallery.outroCompleted.addOnce(function() {
          TweenMax.to(webglView.camera.position, 0.5, {
            x: 0,
            y: 0,
            onComplete: function() {
              map3d.outro();
            }
          });
        });

        itemView.outroCompleted.addOnce(recordsGallery.outro);
        itemView.outro();
      } else if (recordsGallery) {
        // if it is opened remove the signal handler to avoid cinflict
        // recordsGallery.outroCompleted.remove( onRecordsGalleryOutroComplete );
        recordsGallery.outroCompleted.addOnce(map3d.outro);
        recordsGallery.outro();
      } else {
        map3d.outro();
      }
    }

    function destroy() {
      sliderYear = null;
      controller = null;
      introCompleted.dispose();
      introCompleted = null;
      outroCompleted.dispose();
      outroCompleted = null;

      if (recordsGallery) {
        recordsGallery.destroy();
        recordsGallery = null;
      }

      map3d.destroy();

      if (itemView) {
        itemView.destroy();
        itemView = null;
      }
    }

    function render() {
      if (map3d) {
        map3d.render();
      }

      if (itemView) {
        itemView.render();
      }
    }

    function resize() {
      if (map3d) {
        map3d.resize();
      }

      if (itemView) {
        itemView.resize();
      }

      if (recordsGallery && htmlLabel) {
        positionHtmlLabelForRecordsView();
      }
    }

    function map3dIntroCompleted() {
      introCompleted.dispatch();
    }

    function updateYear(year) {
      year = Math.max(config.startYear, Math.min(config.endYear, year));

      if (map3d) {
        map3d.update(year);
      }

      if (sliderYear) {
        sliderYear.update(year);
      }
    }

    function showRecordsGallery(itemsList) {
      recordsGallery = new app.views.common.RecordsGallery(
        webglView, model, itemsList);
      recordsGallery.introCompleted.add(onRecordsGalleryIntroComplete);
      recordsGallery.itemSelected.add(onRecordsGalleryItemSelect);
      recordsGallery.newItemSelected.add(onRecordsGalleryNewItemSelect);
      recordsGallery.intro();
      recordsGallery.outroCompleted.addOnce(onRecordsGalleryOutroComplete);

      htmlLabel = map3d.getCurrentHtmlLabel();
      map3d.freeze(true);
      positionHtmlLabelForRecordsView();
      sliderYear.outro();
    }

    function positionHtmlLabelForRecordsView() {
      var labelPosx = (webglView.$dom.width() - htmlLabel.width) * 0.5;
      var labelPosy = webglView.$dom.height();
      htmlLabel.hideRecordsBtn();
      htmlLabel.tweenPosition(labelPosx, labelPosy, 0.4);
    }

    function onRecordsGalleryIntroComplete() {}

    function onRecordsGalleryOutroComplete() {
      recordsGallery.destroy();
      recordsGallery = null;

      TweenMax.to(webglView.camera.position, 1, {
        x: 0,
        y: 0,
        z: 1500,
        onComplete: function() {
          sliderYear.intro();
          map3d.freeze(false);
          // force update
          map3d.update(model.getYear());
        }
      });
    }

    function onRecordsGalleryItemSelect(item) {
      recordsGallery.disableInteraction();
      openItemView(item);
    }

    function onRecordsGalleryNewItemSelect() {
      // close current Item view
      itemViewBackgroundClick();
    }

    // Model Signals

    function modelYearChanged(year) {
      updateYear(year);
    }

    // area signals
    function onMap3dAreaRecordsClick(data) {
      var year = model.getYear() - config.startYear;
      var yearIndex = Math.floor(year / config.gapYear);
      var itemsList = model.getItemsByAreaAndYearGap(data.id, yearIndex);
      // send this list to the RecordsGallery

      if (itemsList.length > 0) {
        showRecordsGallery(itemsList);
      }
    }

    //
    // ItemView
    //

    function openItemView(selectedItem) {
      // dont use related
      itemView = new app.views.ItemView(webglView, selectedItem);
      itemView.tagClicked.addOnce(itemViewTagClicked);
      itemView.backgroundClicked.addOnce(itemViewBackgroundClick);
      itemView.introCompleted.add(onItemViewIntroComplete);

      var destZ = selectedItem.position.z + webglView.calculateCameraDistance();
      // move camera to the imageObj position
      TweenMax.to(webglView.camera.position, 0.7, {
        z: destZ,
        x: selectedItem.position.x,
        y: selectedItem.position.y,
        ease: Power2.easeInOut,
        onComplete: function() {
          itemView.intro();
        }
      });
      htmlLabel.hide();
    }

    function itemViewTagClicked(tag) {
      controller.goToTagsView(tag);
    }

    function itemViewBackgroundClick() {
      // recordsGallery.disableItemsNav();
      itemView.outroCompleted.addOnce(onItemViewOutroComplete);
      itemView.outro();
    }

    function onItemViewIntroComplete() {
      // recordsGallery.enableItemsNav();
    }

    function onItemViewOutroComplete() {
      itemView.destroy();
      itemView = null;
      htmlLabel.show();
      htmlLabel.showDetails();
      htmlLabel.hideRecordsBtn();
      recordsGallery.deselectItem();
    }
  };
})(window.sl.loom, window.sl.loom.models.configModel);
