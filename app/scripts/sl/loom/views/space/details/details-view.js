(function(app) {
  'use strict';

  var CAMERA_Z_DISTANCE = 800;
  var SELECTED_PARTICLE_SCALE = 200;

  /**
   * Using a different Camera and Scene to render the DetailsView.
   *
   * @param  {Object} webglView     Object with common properties from
   *                                WebGLView Class.
   * @param  {Object} appModel      AppModel instance
   * @param  {Object} controller AppController instance
   */
  var DetailsView = function(webglView, appModel, controller) {
    this.controller = controller;
    this.appModel = appModel;
    this.webglView = webglView;
    this.introCompleted = new signals.Signal();
    this.outroCompleted = new signals.Signal();
    this.itemClicked = new signals.Signal();
    this.areaSelected = new signals.Signal();
    this.galleryOpened = new signals.Signal();
    this.galleryClosed = new signals.Signal();

    this.clonedParticleOffsetX = 0;
    this.cameraInitialPosition = new THREE.Vector3();
    this.renderer = webglView.renderer;
    this.yearColors = app.models.configModel.colorsByYear.slice(); // clone array
    this.camera = webglView.camera;
    this.space = 10;
    this.yearIndex = 0;
    this.year = 0;
    this.raycaster = new THREE.Raycaster();
    this.scene = webglView.scene;
    this.spriteList = [];
    this.isOpen = false;

    this.detailsHtml = new app.views.space.details.DetailsHtml();
    this.troveHtml = new app.views.space.details.DetailsTroveHtml();
    this.locationsHtml = new app.views.space.details.DetailsLocationsHtml();

    this.userMouse = new THREE.Vector2();
    this.normalizedMouse = new THREE.Vector2();
    this.particleInitialPosition = new THREE.Vector3();

    this.onDocumentMouseDownBind = this.onDocumentMouseDown.bind(this);
    this.onDocumentMouseMoveBind = this.onDocumentMouseMove.bind(this);
  };

  DetailsView.prototype = {

    constructor: DetailsView,

    destroy: function() {
      for (var i = 0; i < this.spriteList.length; i++) {
        this.scene.remove(this.spriteList[i]);
      }

      if (this.detailsGalleryHtml) {
        this.detailsGalleryHtml.destroy();
        this.detailsGalleryHtml = null;
      }

      this.introCompleted.dispose();
      this.outroCompleted.dispose();
      this.areaSelected.dispose();
      this.itemClicked.dispose();
      this.appModel.yearChanged.remove(this.setYear, this);
      this.troveHtml.destroy();
      this.detailsHtml.destroy();
      this.locationsHtml.destroy();

      this.renderer.domElement.removeEventListener('mousedown',
        this.onDocumentMouseDownBind);
      this.renderer.domElement.removeEventListener('mousemove',
        this.onDocumentMouseMoveBind);

      TweenMax.killTweensOf(this.camera.position);
      TweenMax.killTweensOf(this.clonedParticle);

      this.appModel = null;
      this.areaSelected = null;
      this.camera = null;
      this.closed = null;
      this.data = null;
      this.detailsHtml = null;
      this.itemClicked = null;
      this.locationsHtml = null;
      this.normalizedMouse = null;
      this.normalizedMouse = null;
      this.onDocumentMouseDownBind = null;
      this.onDocumentMouseMoveBind = null;
      this.particleInitialPosition = null;
      this.raycaster = null;
      this.renderer = null;
      this.spriteList = null;
      this.troveHtml = null;
      this.userMouse = null;
      this.userMouse = null;
      this.yearColors = null;
    },

    outro: function(useSyncParticleAnimation) {
      clearTimeout(this.galleryOpenTimeout);
      this.disableListeners();
      this.appModel.yearChanged.remove(this.setYear, this);

      if (useSyncParticleAnimation) {
        this.troveHtml.close();
        this.detailsHtml.close();
        this.locationsHtml.close();
        this.animateParticlesOut(useSyncParticleAnimation);
        setTimeout(this.animateCameraOut.bind(this), 500,
          useSyncParticleAnimation);
      } else {
        if (this.recordsGallery) {
          this.recordsGallery.outroCompleted
            .remove(this.onRecordsGalleryOutroComplete, this);
        }

        if (this.itemView) {
          this.recordsGallery.disableItemsNav();
          // need to put the camera.position.Y back to 0;
          this.recordsGallery.outroCompleted.addOnce(function() {
            TweenMax.to(this.webglView.camera.position, 0.5, {
              x: 0,
              y: 0,
              onComplete: function() {
                this.outroCompleted.dispatch();
              },
              onCompleteScope: this
            });
          }, this);

          this.itemView.outroCompleted.addOnce(this.recordsGallery.outro, this);
          this.itemView.outro();
        } else if (this.recordsGallery) {
          // if it is opened remove the signal handler to avoid conflict
          this.recordsGallery.outroCompleted
            .addOnce(this.outroCompleted.dispatch, this);
          this.recordsGallery.outro();
        } else {
          this.troveHtml.close();
          this.detailsHtml.close();
          this.locationsHtml.close();
          this.animateParticlesOut(false);
          setTimeout(this.animateCameraOut.bind(this), 500, false);
        }
      }

      this.data = null;
      this.isOpen = false;
    },

    intro: function(topicObj, currentAreaId, particleSprite, camera) {
      if (this.spriteList.length === 0) {
        this.createSprites();
      } else {
        // hide items
        for (var i = 0; i < this.spriteList.length; i++) {
          this.spriteList[i].visible = (i === this.yearIndex);
        }
      }

      // same object from particles view, please copy it later and manipulate
      // the copied object!
      this.currentAreaId = currentAreaId;

      // save initial camera position to use when closing
      this.cameraInitialPosition.copy(camera.position);
      // clone camera position and rotation
      this.camera.position.copy(camera.position);

      this.originalParticle = particleSprite;

      this.clonedParticle = this.spriteList[this.yearIndex];
      this.clonedParticle.position.set(0, 0, 0);
      this.clonedParticle.rotation.set(0, 0, 0);

      // copy properties
      this.clonedParticle.material.color.copy(particleSprite.material.color);
      this.clonedParticle.material.needsUpdate = true;
      // copy userData!!!
      // set the index to avoid the bug when clicked on clonedParticle.
      this.clonedParticle.userData = $.extend(true, {index: this.yearIndex},
        particleSprite.userData);

      this.clonedParticle.scale.copy(particleSprite.scale);
      particleSprite.visible = false;

      // copy particle initial position
      this.particleInitialPosition.copy(particleSprite.position);

      this.appModel.yearChanged.add(this.setYear, this);
      this.data = topicObj;

      this.troveHtml.setTopicAndLocation(this.data.key, '');
      this.detailsHtml.setTitle(this.data.key);

      this.animateCameraIn();
    },

    setYear: function(value) {
      // max value should be 1999 and not 2000.
      value = Math.min(app.models.configModel.endYear - 1, value);
      value -= (value % app.models.configModel.gapYear);

      if (value === this.year) {
        return;
      }
      this.year = value;
      this.yearIndex = this.appModel.getYearIndex(value);

      if (!this.isOpen) {
        return;
      }

      if (this.data) {
        this.updateLocationData();

        if (this.isOpen) {
          this.moveCamera(true);
        }
      }

      this.detailsHtml.setYear(value);
      this.troveHtml.setYear(value);
      this.locationsHtml.setYear(value);
    },

    changeArea: function(areaId) {
      this.currentAreaId = areaId;
      this.updateSprites(areaId, true);
      this.locationsHtml.selectByAreaId(areaId);
    },

    openAnimationCompleted: function() {
      this.clonedParticle = null;
      this.isOpen = true;
      // force to update html elements
      this.setYear(this.year);
      this.introCompleted.dispatch();
      this.enableListeners();
    },

    animateCameraIn: function() {
      var transitionTime = 0.5;
      var ease = Power2.easeOut;

      app.views.space.particles.ParticleSprite.tweenRemoveHSLOffset(
        this.clonedParticle, new THREE.Color(this.yearColors[this.yearIndex]));

      // we need to use the camera target so the camera.rotation dont go crazy
      TweenMax.to(this.camera.position, transitionTime, {
        x: 0,
        y: 0,
        z: CAMERA_Z_DISTANCE,
        ease: ease
      });

      // scale down the clonedParticle to match the designs
      var s = this.data[this.currentAreaId][this.yearIndex] + 2;
      this.clonedParticle.userData.finalScale = s;
      this.updateHtmlElementsOffsetY(s);

      TweenMax.to(this.clonedParticle.scale, transitionTime, {
        x: s,
        y: s,
        ease: ease,
        onComplete: this.animateParticlesIn,
        onCompleteScope: this
      });
    },

    animateCameraOut: function(/* useSyncParticleAnimation */) {
      var transitionTime = 1;
      var ease = Power2.easeIn;

      // we need to use the camera target so the camera.rotation dont go crazy
      TweenMax.to(this.camera.position, transitionTime, {
        x: this.cameraInitialPosition.x,
        z: this.cameraInitialPosition.z, // use camera initial position
        y: this.cameraInitialPosition.y,
        ease: ease
      });

      // move the current sprite to its initialpositision
      var item = this.spriteList[this.yearIndex];
      var scope = this;

      // update original particle
      app.views.space.particles.ParticleSprite.update(
        this.originalParticle,
        item.userData.currentCount,
        new THREE.Color(this.yearColors[this.yearIndex])
      );

      this.originalParticle.visible = false;
      // make the selected item to move to the originalParticle position
      TweenMax.to(item.position, transitionTime, {
        x: this.originalParticle.userData.initX,
        y: this.originalParticle.userData.initY,
        z: this.originalParticle.userData.initZ,
        ease: ease,
        onComplete: function() {
          item.visible = false;
          scope.originalParticle.visible = true;
          scope.outroCompleted.dispatch();
        }
      });

      TweenMax.to(item.scale, transitionTime, {
        x: this.originalParticle.scale.x,
        y: this.originalParticle.scale.y,
        ease: ease
      });
    },

    animateParticlesIn: function() {
      this.updateCounts();
      var c = 0;
      var clonedParticleOffsetX = 0;
      var i;
      var time = 0.4;
      var s;
      var x;
      var biggestDelay = 0;
      // find the clonedParticleOffsetX
      for (i = 0; i < this.spriteList.length; i++) {
        s = this.spriteList[i].userData.count + 2;
        x = c + s * 0.5;
        c += s + this.space;

        if (i === this.yearIndex) {
          clonedParticleOffsetX = x;
          break;
        }
      }

      // initialize c as offset
      c = -clonedParticleOffsetX;
      this.clonedParticleOffsetX = clonedParticleOffsetX;

      var delay = 0;
      // animate all
      for (i = 0; i < this.spriteList.length; i++) {
        var item = this.spriteList[i];
        s = item.userData.count + 2;
        x = c + s * 0.5;
        c += s + this.space;

        delay = Math.abs(i - this.yearIndex) * 0.02;
        if (delay > biggestDelay) {
          biggestDelay = delay;
        }
        item.userData.finalScale = s;
        item.userData.x = x;

        if (i !== this.yearIndex) {
          item.position.x = x;
          item.position.y = 0;
          item.position.z = -50;
          item.scale.set(0.01, 0.01, 0);
          item.visible = true;
          // the time will be bigger with bigger particles
          TweenMax.to(item.position, time + Math.min(0.5, s * 0.01), {
            x: x,
            z: 0,
            ease: Power2.easeOut,
            delay: delay
          });

          // the time will be bigger with bigger particles
          TweenMax.to(item.scale, time, {
            x: s,
            y: s,
            delay: delay + 0.1,
            ease: Power2.easeOut
          });
        }
      }

      // creathe elements!!!
      setTimeout(this.showHtmlElements.bind(this), biggestDelay * 1000);
    },

    animateParticlesOut: function(useSyncParticleAnimation) {
      var delay;
      var i;
      var item;
      var s = 1;
      var time = 0.4;

      for (i = 0; i < this.spriteList.length; i++) {
        if (useSyncParticleAnimation && i === this.yearIndex) {
          // dont animate the particle to be synched with the ParticlesView!!!
          continue;
        }

        item = this.spriteList[i];
        delay = Math.abs(i - this.yearIndex) * 0.02;

        // dont hide the current sprite for the year to use as part
        // of the animation
        // the time will be bigger with bigger particles
        TweenMax.to(item.scale, time, {
          x: s,
          y: s,
          delay: delay,
          ease: Power2.easeInOut,
          onCompleteParams: [item],
          onComplete: function(item) {
            item.visible = false;
          }
        });
      }
    },

    animateParticlesForGalleryIn: function() {
      var delay;
      var i;
      var item;
      var s = 0.1;
      var time = 0.2;
      // animate out sprites
      for (i = 0; i < this.spriteList.length; i++) {
        item = this.spriteList[i];
        // delay += 0.05;

        if (i === this.yearIndex) {
          // dont animate the particle to be synched with the ParticlesView!!!
          continue;
        }

        delay = Math.abs(i - this.yearIndex) * 0.005;

        TweenMax.to(item.scale, time, {
          x: s,
          y: s,
          delay: delay,
          ease: Back.easeIn,
          onCompleteParams: [item],
          onComplete: function(item) {
            item.visible = false;
          }
        });
      }
    },

    animateParticlesForGalleryOut: function() {
      var delay;
      var i;
      var item;
      var time = 0.5;
      var currentItem = this.spriteList[this.yearIndex];

      TweenMax.to(currentItem.position, 0.5, {
        x: currentItem.userData.x,
        ease: Power2.easeOut,
        delay: 0.4
      });

      for (i = 0; i < this.spriteList.length; i++) {
        item = this.spriteList[i];
        delay = Math.abs(i - this.yearIndex) * 0.02 + 0.9;
        item.visible = true;
        TweenMax.to(item.scale, time, {
          x: item.userData.finalScale,
          y: item.userData.finalScale,
          delay: delay,
          ease: Back.easeOut
        });
      }
    },

    animateParticleForItemDetailsIn: function() {
      var item = this.spriteList[this.yearIndex];
      var s = 0.1;
      TweenMax.to(item.scale, 0.4, {
        x: s,
        y: s,
        ease: Back.easeIn,
        onCompleteParams: [item],
        onComplete: function(item) {
          item.visible = false;
        }
      });
    },

    animateParticleForItemDetailsOut: function() {
      var item = this.spriteList[this.yearIndex];
      item.visible = true;
      TweenMax.to(item.scale, 0.6, {
        x: SELECTED_PARTICLE_SCALE,
        y: SELECTED_PARTICLE_SCALE,
        ease: Back.easeOut
      });
    },
    render: function() {
      this.renderer.render(this.scene, this.camera);
    },

    showHtmlElements: function() {
      // force the html elements to be in the right position when they open.
      this.updateHtmlElementsOffsetY(this.clonedParticle.userData.finalScale);
      this.updateLocationData();

      this.troveHtml.open();
      this.troveHtml.setYear(this.year);
      this.locationsHtml.setYear(this.year);
      this.locationsHtml.open();
      this.detailsHtml.setYear(this.year);
      this.detailsHtml.open();

      this.detailsHtml.galleryButtonClicked.add(
        this.onGalleryButtonClicked, this);

      this.locationsHtml.itemSelected.add(this.onAreaSelected, this);

      // update sprites to have a the same XYZ then the particleInitialPosition
      this.locationsHtml.selectByAreaId(this.currentAreaId);

      // after animate elements IN
      // Add animation later later!!
      this.openAnimationCompleted();
    },

    enableListeners: function() {
      this.renderer.domElement.addEventListener('mousedown',
        this.onDocumentMouseDownBind);
      this.renderer.domElement.addEventListener('mousemove',
        this.onDocumentMouseMoveBind);
    },

    disableListeners: function() {
      this.renderer.domElement.removeEventListener('mousedown',
        this.onDocumentMouseDownBind);
      this.renderer.domElement.removeEventListener('mousemove',
        this.onDocumentMouseMoveBind);
    },

    createSprites: function() {
      var yearMin = app.models.configModel.startYear;
      var yearMax = app.models.configModel.endYear;
      var yearGap = app.models.configModel.gapYear;
      var len = (yearMax - yearMin) / yearGap;
      var o;
      var color;

      // create one particle for each year gap
      for (var i = 0; i < len; i++) {
        color = new THREE.Color(this.yearColors[i]);
        o = app.views.space.particles.ParticleSprite.createBasic(color);
        o.scale.set(0.01, 0.01, 1);
        o.userData.index = i;
        o.userData.x = o.position.x;
        o.position.z = -50;
        this.spriteList.push(o);
        this.scene.add(o);
      }
    },

    updateLocationData: function() {
      this.detailsHtml.setTotal(this.data.all[this.yearIndex]);

      var locationsList = [];
      var list = app.services.TopicsService.areas;
      var i;

      for (i = 0; i < list.length; i++) {
        // add a copy of the areas
        locationsList.push({
          id: list[i].id,
          name: list[i].name,
          count: 0
        });
      }

      // update array
      for (i = 0; i < locationsList.length; i++) {
        // add the count
        if (this.data[locationsList[i].id]) {
          // only add the count if the area object exists.
          locationsList[i].count = this.data[locationsList[i].id][
            this.yearIndex
          ];
        }
      }

      // update the items
      this.itemsList = this.appModel
        .getItemsByTopicAndYearGap(this.data.key, this.year);

      this.detailsHtml.setImagesTotal(this.itemsList.length);

      this.locationsHtml.update(locationsList);
    },

    updateCounts: function() {
      // reorder the sizes and positions based on the count for all locations
      var topicObj = this.data;
      var count;
      for (var i = 0; i < this.spriteList.length; i++) {
        count = 0;
        if (topicObj.hasOwnProperty(this.currentAreaId)) {
          count = topicObj[this.currentAreaId][i];
        }
        this.spriteList[i].userData.count = count;
      }
    },

    updateSprites: function(location, useAnimation) {
      // reorder the sizes and positions based on the count for all locations
      var topicObj = this.data;
      var c = -this.clonedParticleOffsetX;
      // var c = this.particleInitialPosition.x;
      var space = this.space;
      var time = 0.75;

      var item;
      var index;
      var len = this.spriteList.length;
      var ease;

      for (index = 0; index < len; index++) {
        var s = 2; // minimun scale;
        item = this.spriteList[index];

        if (topicObj.hasOwnProperty(location)) {
          // use the value of the location if it exists
          s = topicObj[location][index] + 2;
        }
        var x = c + s * 0.5;
        c += s + space;
        item.userData.index = index;
        item.userData.finalScale = s;
        item.userData.x = x;

        // the current index needs to show the html info
        if (index === this.yearIndex) {
          this.updateHtmlElementsOffsetY(s);
        }

        if (useAnimation) {
          TweenMax.to(item.position, time, {
            x: x,
            ease: Power2.easeOut
          });

          ease = (s > item.scale.x) ? Power2.easeInOut : Power2.easeOut;

          TweenMax.to(item.scale, time, {x: s, y: s, ease: ease});
        } else {
          item.position.x = x;
          item.scale.x = s;
          item.scale.y = s;
        }
      }
      // use the same time to move the camera x
      this.moveCamera(useAnimation, time);
    },

    updateHtmlElementsOffsetY: function(particleScale) {
      // use timeout so the elemets will hav ethe right height
      setTimeout(function(scope) {
        // get the height after render
        scope.detailsHtml.setOffsetY(particleScale);
        scope.locationsHtml.setOffsetY(particleScale);
        scope.troveHtml.setY(scope.detailsHtml.y);
      }, 10, this);
    },

    moveCamera: function(useAnimation, time) {
      var item = this.spriteList[this.yearIndex];
      var cameraX = item.userData.x;

      this.updateHtmlElementsOffsetY(item.userData.finalScale);

      if (useAnimation) {
        var vtime = (Math.abs(this.camera.position.x - cameraX) * 0.001) + 0.1;
        time = time || vtime;
        TweenMax.to(this.camera.position, time, {
          x: cameraX, ease: Power2.easeOut
        });
      } else {
        this.camera.position.x = this.scene.children[this.yearIndex].position.x;
      }
    },

    resize: function() {
      var b = document.body;
      this.camera.aspect = b.clientWidth / b.clientHeight;
      this.camera.updateProjectionMatrix();
      this.render();
    },

    updateMouse: function(event) {
      var dw = this.renderer.domElement.clientWidth;
      var dh = this.renderer.domElement.clientHeight;

      this.userMouse.x = event.pageX;
      this.userMouse.y = event.pageY;
      this.normalizedMouse.x = (event.pageX / dw) * 2 - 1;
      this.normalizedMouse.y = -(event.pageY / dh) * 2 + 1;
    },

    raycastSprites: function() {
      this.raycaster.setFromCamera(this.normalizedMouse, this.camera);
      return this.raycaster.intersectObjects(this.scene.children);
    },

    onDocumentMouseMove: function(event) {
      this.updateMouse(event);

      if (this.raycastSprites().length > 0) {
        this.renderer.domElement.style.cursor = 'pointer';
      } else {
        this.renderer.domElement.style.cursor = 'auto';
      }
    },

    onDocumentMouseDown: function(event) {
      this.updateMouse(event);
      var intersects = this.raycastSprites();

      // check if it hits one of the particles in the screen
      // if dont please close this view.
      if (intersects.length > 0) {
        var index = intersects[0].object.userData.index;
        this.itemClicked.dispatch(index);
      } else {
        // use true to sync the animation with ParticlesView
        this.outro(true);
      }
    },

    onGalleryButtonClicked: function() {
      this.showRecordsGallery();
    },

    onAreaSelected: function(areaId) {
      this.areaSelected.dispatch(areaId);
    },

    // RECORDS gallery
    showRecordsGallery: function() {
      this.cameraDetailsPosition = this.camera.position.clone();

      var recordsGallery = new app.views.common.RecordsGallery(
        this.webglView, null, this.itemsList);
      recordsGallery.introCompleted.add(
        this.onRecordsGalleryIntroComplete, this);
      recordsGallery.itemSelected.add(
        this.onRecordsGalleryItemSelected, this);
      recordsGallery.outroCompleted.addOnce(
        this.onRecordsGalleryOutroComplete, this);
      recordsGallery.newItemSelected.add(
        this.onRecordsGalleryNewItemSelect, this);
      this.recordsGallery = recordsGallery;
      this.detailsHtml.close();
      this.locationsHtml.close();
      this.troveHtml.close();
      this.disableListeners();

      if (this.detailsGalleryHtml) {
        this.detailsGalleryHtml.setTitle(this.data.key);
      } else {
        this.detailsGalleryHtml = new app.views.space.details
          .DetailsGalleryHtml(this.data.key); // title
      }

      this.detailsGalleryHtml.update(
        // total images
        this.itemsList.length,
        // year
        this.year
      );

      this.animateParticlesForGalleryIn();
      this.galleryOpened.dispatch();

      var currentItem = this.spriteList[this.yearIndex];

      this.galleryOpenTimeout = setTimeout(function() {
        // hard move to 0 so the galerry will not jump
        this.camera.position.x = 0;
        currentItem.position.x = 0;

        TweenMax.to(currentItem.position, 0.4, {
          x: -200,
          ease: Power2.easeOut
        });
        TweenMax.to(currentItem.scale, 0.4, {
          x: SELECTED_PARTICLE_SCALE,
          y: SELECTED_PARTICLE_SCALE,
          ease: Power2.easeInOut
        });

        this.detailsGalleryHtml.intro();
        this.recordsGallery.intro();
      }.bind(this), 1000);
    },

    onRecordsGalleryNewItemSelect: function() {
      // close current Item view
      this.itemViewBackgroundClick();
    },

    onRecordsGalleryIntroComplete: function() {},

    onRecordsGalleryOutroComplete: function() {
      this.galleryClosed.dispatch();
      this.detailsGalleryHtml.outro();
      this.animateParticlesForGalleryOut();

      TweenMax.to(this.camera.position, 0.5, {
        x: this.cameraDetailsPosition.x,
        y: this.cameraDetailsPosition.y,
        z: this.cameraDetailsPosition.z,
        ease: Power2.easeOut,
        delay: 0.4,
        onComplete: function() {
          this.detailsHtml.open();
          this.locationsHtml.open();
          this.troveHtml.open();
          // this.animateParticlesIn();
        },
        onCompleteScope: this
      });

      this.enableListeners();
    },

    onRecordsGalleryItemSelected: function(selectedItem) {
      this.openItemView(selectedItem);
    },

    //
    // ItemView
    //

    openItemView: function(selectedItem) {
      // dont use related
      this.itemView = new app.views.ItemView(this.webglView, selectedItem);
      this.itemView.tagClicked.addOnce(this.itemViewTagClicked, this);
      this.itemView.backgroundClicked.addOnce(
        this.itemViewBackgroundClick, this);
      this.itemView.introCompleted.add(this.onItemViewIntroComplete, this);

      var destZ = selectedItem.position.z +
        this.webglView.calculateCameraDistance();
      // move camera to the imageObj position
      TweenMax.to(this.webglView.camera.position, 0.7, {
        z: destZ,
        x: selectedItem.position.x,
        y: selectedItem.position.y,
        ease: Power2.easeInOut,
        onComplete: function() {
          this.itemView.intro();
        },
        onCompleteScope: this
      });

      this.detailsGalleryHtml.outro();
      this.animateParticleForItemDetailsIn();
    },

    itemViewTagClicked: function(tag) {
      this.controller.goToTagsView(tag);
    },

    itemViewBackgroundClick: function() {
      this.itemView.outroCompleted.addOnce(this.onItemViewOutroComplete, this);
      this.itemView.outro();
    },

    onItemViewIntroComplete: function() {
    },

    onItemViewOutroComplete: function() {
      this.itemView.destroy();
      this.itemView = null;
      this.recordsGallery.deselectItem();
      this.detailsGalleryHtml.intro();
      this.animateParticleForItemDetailsOut();
    }
  };
  app.views.space.details.DetailsView = DetailsView;
})(window.sl.loom);
