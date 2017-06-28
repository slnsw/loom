(function(classPath) {
  'use strict';

  classPath.SpaceView = function(webglView, appModel) {
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var controller;
    var currentAreaId = 'all';
    var currentView;
    var detailsView;
    var particlesView;
    var sliderYear;

    function destroy() {
      if (particlesView) {
        particlesView.destroy();
        particlesView = null;
      }

      if (detailsView) {
        detailsView.destroy();
        detailsView = null;
      }

      introCompleted.removeAll();
      introCompleted.dispose();
      introCompleted = null;

      outroCompleted.removeAll();
      outroCompleted.dispose();
      outroCompleted = null;

      appModel = null;
      controller = null;
      currentView = null;
    }

    function intro() {
      init();
    }

    function outro() {
      appModel.yearChanged.remove(modelYearChanged);
      if (currentView) {
        currentView.outroCompleted.removeAll();
        currentView.outroCompleted.addOnce(outroCompleted.dispatch);
        currentView.outro();
      } else {
        outroCompleted.dispatch();
      }
    }

    function render() {
      if (currentView) {
        if (currentView === particlesView) {
          particlesView.render(webglView.renderer);
        } else {
          detailsView.render(webglView.renderer);
        }
      }
    }

    function resize() {
      particlesView.resize();
      detailsView.resize();
    }

    function setController(value) {
      controller = value;
    }

    function setSliderYear(value) {
      sliderYear = value;
    }

    function init() {
      detailsView = new classPath.space.details
        .DetailsView(webglView, appModel, controller);
      detailsView.setYear(appModel.getYear());

      particlesView = new classPath.space.particles
        .ParticlesView(webglView, appModel);
      particlesView.particleSelected.add(onParticleSelected);
      particlesView.areaSelected.add(onAreaSelected);
      currentView = particlesView;

      particlesView.introCompleted.addOnce(function() {
        appModel.yearChanged.add(modelYearChanged);
        introCompleted.dispatch();
      });

      particlesView.intro();
    }

    function onParticleSelected(userData, particleSprite, camera) {
      particlesView.pause();
      detailsView.setYear(appModel.getYear());
      detailsView.intro(userData.obj, currentAreaId, particleSprite, camera);
      detailsView.outroCompleted.addOnce(onDetailsViewClosed);
      detailsView.itemClicked.add(onDetailsViewItemClicked);
      detailsView.areaSelected.add(onAreaSelected);
      // open and close slider
      detailsView.galleryOpened.add(sliderYear.outro);
      detailsView.galleryClosed.add(sliderYear.intro);

      currentView = detailsView;
    }

    function onAreaSelected(areaId) {
      // update current Area and also update current view
      currentAreaId = areaId;
      currentView.changeArea(areaId);
    }

    function onDetailsViewItemClicked(index) {
      var year = appModel.getYearByIndex(index);
      // Update the current Year based on the index of
      // the itemClicked inside details view.
      appModel.setYear(year);
    }

    function onDetailsViewClosed() {
      currentView = particlesView;
      particlesView.changeArea(currentAreaId);
      particlesView.resume();
    }

    function modelYearChanged(year) {
      if (sliderYear) {
        sliderYear.update(year);
      }
    }

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
  };
})(window.sl.loom.views);
