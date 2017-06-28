(function(app, config) {
  'use strict';

  app.views.TunnelView = function(webglView, model) {
    // variables
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var zOffset = 5000;
    var YEAR_Z_DISTANCE = 400;
    var CAMERA_Z_DISTANCE = 1500;
    var CAMERA_MIN_Z = CAMERA_Z_DISTANCE;
    var controller;
    var yearLabels = [];
    var mouse = new THREE.Vector2(0, 0);
    var colorDictByYear;
    var itemView;
    var itemsMovedAway;
    var sliderYear;

    var itemRadius1 = 400;
    var itemRadius2 = 800;
    var itemRadius3 = 1200;
    var autoAnimate = false;
    var mousewheelTimer;

    var autoAnimateSpeed = 1;
    var autoAnimateDirection = -1;

    var CAMERA_IN_LIMIT = CAMERA_MIN_Z + zOffset;
    var yearDif = config.endYear - config.startYear;
    var CAMERA_OUT_LIMIT = CAMERA_IN_LIMIT + (yearDif) * YEAR_Z_DISTANCE;

    return {
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      destroy: destroy,
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
      sliderYear.started.add(function() {
        autoAnimate = false;
      });

      sliderYear.stopped.add(function() {
        autoAnimate = true;
      });
    }

    function intro() {
      calculateItemsPositions();
      // createSlider();
      resetThumbsPosition();
      createYears();

      var destZ = getCameraZByYear(model.getYear());
      var time = Math.abs(destZ - webglView.camera.position.z) * 0.0001;
      time = time.toFixed(1);
      time = Math.max(0.7, time);

      TweenMax.to(webglView.camera.rotation, time, {
        x: 0,
        y: 0,
        z: 0,
        delay: 0.1,
        ease: Power2.easeOut
      });

      TweenMax.to(webglView.camera.position, time, {
        z: destZ,
        x: 0,
        y: 300,
        delay: 0.4,
        ease: Power2.easeOut,
        onComplete: function() {
          introCompleted.dispatch();
          autoAnimate = true;
          model.yearChanged.add(modelYearChanged);
          updateYear(model.getYear());
          enableInteraction();
        }
      });
    }

    function outro() {
      autoAnimate = false;
      disableInteraction();
      model.yearChanged.remove(modelYearChanged);

      if (itemView) {
        // finish t
        itemView.outroCompleted.addOnce(outroCompleted.dispatch);
        itemView.outro();
      } else {
        setTimeout(outroCompleted.dispatch, 500);
      }
    }

    function destroy() {
      if (itemView) {
        itemView.destroy();
      }

      clearTimeout(mousewheelTimer);

      sliderYear = null;
      controller = null;
      introCompleted.dispose();
      introCompleted = null;
      outroCompleted.dispose();
      outroCompleted = null;

      for (var i = 0; i < yearLabels.length; i++) {
        var yl = yearLabels[i];
        webglView.scene.remove(yl);
      }

      yearLabels = [];
      colorDictByYear = null;
    }

    function render() {
      if (itemView === undefined) {
        autoMoveCamera();
      } else {
        itemView.render();
      }

      webglView.camera.updateMatrixWorld();
    }

    function resize() {
      if (itemView) {
        itemView.resize();
      }
    }

    // Private Methods
    //

    function autoMoveCamera() {
      if (autoAnimate) {
        if (webglView.camera.position.z < CAMERA_IN_LIMIT) {
          // camera zoom in limit reached, change direction
          autoAnimateDirection = 1;
        } else if (webglView.camera.position.z > CAMERA_OUT_LIMIT) {
          // camera zoom out limit reached, change direction
          autoAnimateDirection = -1;
        }

        var camZ = webglView.camera.position.z;
        var incZ = autoAnimateSpeed * autoAnimateDirection;
        webglView.camera.position.z = camZ + incZ;

        // update year based on camera Z position
        var z = (webglView.camera.position.z - zOffset - CAMERA_Z_DISTANCE);
        z = z / YEAR_Z_DISTANCE + config.startYear;
        z = Math.min(config.endYear, Math.max(config.startYear, Math.round(
          z)));
        model.setYear(z);
      }
    }

    function getRelatedItems(selectedItem) {
      var relatedItemsData = [];
      // show only one thumb per tag
      if (selectedItem) {
        // var auxList = [];
        var auxDict = {};

        // check all tags for the selectedItem
        selectedItem.data.tags.forEach(function(element) {
          // get thumbs related to the tag (element)
          var relatedItemsList = model.getItemsByTag(element);

          // // check ig the validThumb items are not in the relatedThumbsByTagList,
          // // if so add only one thumb to the relatedThumbsByTagList
          for (var i = 0; i < relatedItemsList.length; i++) {
            // save all possible related
            if (auxDict[relatedItemsList[i].itemId] === undefined) {
              auxDict[relatedItemsList[i].itemId] = relatedItemsList[i];
            }
          }
        });

        if (auxDict[selectedItem.data.itemId] !== undefined) {
          // delete the reference to the selectedItem itemID
          // we dont need to show the selectedItem as a related.
          delete auxDict[selectedItem.data.itemId];
        }

        // Check if the related items exists in the Tunnel view
        // this solution is just for now, it needs to be changed.
        webglView.itemsList.forEach(function(element) {
          if (auxDict[element.data.itemId] !== undefined) {
            // only add if the item is in the auxList and in the TunnelView thumbs
            relatedItemsData.push(auxDict[element.data.itemId]);
          }
        });
      }

      return relatedItemsData;
    }

    function openItemView(selectedItem) {
      autoAnimate = false;
      var related = getRelatedItems(selectedItem);

      itemView = new app.views.ItemView(webglView, selectedItem, related);

      itemView.tagClicked.addOnce(itemViewTagClicked);
      itemView.relatedItemClicked.addOnce(itemViewRelatedItemClicked);
      itemView.backgroundClicked.addOnce(itemViewBackgroundClick);
      itemView.backgroundThumbClicked.addOnce(itemViewBackgroundThumbClick);

      itemView.introCompleted.add(itemViewIntroCompleted);

      var destZ = selectedItem.position.z + webglView.calculateCameraDistance();
      var time = Math.abs(destZ - webglView.camera.position.z) * 0.00015;
      time = time.toFixed(1);
      time = Math.max(1, time);

      // move camera to the imageObj position
      // use the spacePosition because sometimes the related item was moved away
      // because it was near to the selected item, and if we use the current
      // position it will cause the camera to not be looking to the
      // right position
      TweenMax.to(webglView.camera.position, time, {
        z: destZ,
        x: selectedItem.data.spacePosition.x,
        y: selectedItem.data.spacePosition.y,
        ease: Power2.easeInOut,
        delay: 0.1,
        onComplete: function() {
          itemView.intro();
        }
      });

      sliderYear.outro();
    }

    function itemViewTagClicked(tag) {
      controller.goToTagsView(tag);
    }

    function itemViewRelatedItemClicked(itemId) {
      itemView.outroCompleted.addOnce(function() {
        itemView.destroy();
        itemView = undefined;
        moveItemsToOriginalPosition();
        showNextItemById(itemId);
      });

      itemView.outro();
    }

    function itemViewBackgroundClick() {
      itemView.outroCompleted.addOnce(function() {
        autoAnimate = true;
        moveItemsToOriginalPosition();
        itemView.destroy();
        itemView = undefined;
        sliderYear.intro();
        enableInteraction();
      });
      itemView.outro();
    }

    function itemViewBackgroundThumbClick(thumb) {
      itemView.outroCompleted.addOnce(function() {
        autoAnimate = true;
        moveItemsToOriginalPosition();
        itemView.destroy();
        itemView = undefined;
        openItemView(thumb);
      });
      itemView.outro();
    }

    function itemViewIntroCompleted() {
      moveItemsAwayFromSelected();
    }

    function showNextItemById(itemId) {
      var item = webglView.getItemById(itemId);
      openItemView(item);
    }

    function moveItemsAwayFromSelected() {
      var selectedItem = itemView.getSelectedItem();
      var len = webglView.itemsList.length;
      var item;
      var destZ = selectedItem.position.z + webglView.calculateCameraDistance();
      var p = selectedItem.position;
      var distance;

      itemsMovedAway = [];

      for (var i = 0; i < len; i++) {
        item = webglView.itemsList[i];
        if (item.position.z >= selectedItem.position.z - 100 &&
          item.position.z <= destZ && item !== selectedItem) {
          distance = p.distanceTo(item.position);
          // remove form the view
          if (distance < 1000) {
            itemsMovedAway.push(item);
          }
        }
      }

      itemsMovedAway.forEach(function(element) {
        var ep = element.position;
        var deltaY = p.y - ep.y;
        var deltaX = p.x - ep.x;
        var ang = Math.atan2(deltaY, deltaX);
        var x = Math.round(Math.cos(ang - Math.PI) * 800 + ep.x);
        var y = Math.round(Math.sin(ang - Math.PI) * 800 + ep.y);

        TweenMax.to(element.position, 1, {
          x: x,
          y: y,
          ease: Linear.easeIn
        });
      });
    }

    function moveItemsToOriginalPosition() {
      itemsMovedAway.forEach(function(element) {
        TweenMax.to(element.position, 1, {
          x: element.data.spacePosition.x,
          y: element.data.spacePosition.y,
          z: element.data.spacePosition.z,
          ease: Power1.easeOut
        });
      });
    }

    function displayItemInCircle(items, radius, startAngle) {
      var angleInc = (Math.PI * 2) / items.length;
      var angle = startAngle;
      var item;
      var i;
      var x;
      var y;
      var z;

      radius += Math.round(Math.random() * 300 - 150);

      for (i = 0; i < items.length; i++) {
        item = items[i];
        z = (item.data.year - config.startYear) * YEAR_Z_DISTANCE + zOffset;
        x = Math.round(Math.cos(angle - Math.PI) * radius * 1.25);
        y = Math.round(Math.sin(angle - Math.PI) * radius);
        angle += angleInc;
        item.data.spacePosition = {
          x: x,
          y: y,
          z: z
        };
      }
    }

    function prepareItemsToDisplay(items, startAngle) {
      var aux;

      if (items.length > 0) {
        if (items.length <= 5) {
          // small circle
          aux = itemRadius1 + items.length * 32;
          displayItemInCircle(items, aux, startAngle);
        } else if (items.length <= 12) {
          // small circle
          displayItemInCircle(items.slice(0, 6), itemRadius1, startAngle);

          // medium circle
          aux = itemRadius2 + items.length * 32;
          displayItemInCircle(items.slice(6, items.length), aux, startAngle);
        } else {
          // small circle
          displayItemInCircle(items.slice(0, 6), itemRadius1, startAngle);

          // medium circle
          aux = itemRadius2 + items.length * 32;
          displayItemInCircle(items.slice(6, 12), aux, startAngle);

          // large circle
          aux = items.length + items.length * 32;
          displayItemInCircle(items.slice(12, aux), itemRadius3, startAngle);
        }
      }
    }

    function calculateItemsPositions() {
      var itemsList = webglView.itemsList;
      var oldYear = 0;
      var curItems = [];
      var i;
      var item;
      var c = 0;

      for (i = 0; i < itemsList.length; i++) {
        item = itemsList[i];

        if (!item.data.spacePosition) {
          if (item.data.year !== oldYear) {
            c += Math.PI / 7;
            prepareItemsToDisplay(curItems, c);
            curItems = [];
          }
          curItems.push(item);
          oldYear = item.data.year;
        }
      }

      prepareItemsToDisplay(curItems, 0);
    }

    function resetThumbsPosition() {
      var item;
      var i;
      var itemsList = webglView.itemsList;
      var useAnimation = true;

      switch (model.getPreviousState()) {
        case undefined:
        case 'Intro':
          useAnimation = false;
          break;
        default:
          useAnimation = true;
      }

      for (i = 0; i < itemsList.length; i++) {
        item = itemsList[i];
        item.visible = true;

        if (useAnimation) {
          TweenMax.to(item.position, 1, {
            x: item.data.spacePosition.x,
            y: item.data.spacePosition.y,
            z: item.data.spacePosition.z,
            ease: Power1.easeInOut
          });
        } else {
          // no animation!!!
          item.position.x = item.data.spacePosition.x;
          item.position.y = item.data.spacePosition.y;
          item.position.z = item.data.spacePosition.z;
        }

        item.scale.x = 1.0;
        item.scale.y = 1.0;
        item.rotation.x = 0;
        item.rotation.y = 0;
        item.rotation.z = 0;
      }
    }

    function createYears() {
      var i = 0;
      var color;
      var y; // year
      colorDictByYear = {};

      for (y = config.startYear; y <= config.endYear; y += config.gapYear) {
        color = config.colorsByYear[i];
        createYearText(y, color);
        colorDictByYear[y] = color;
        i++;
      }
    }

    function createYearText(year, color) {
      // drawing a big texture to make the quality better
      var z = (year - config.startYear) * YEAR_Z_DISTANCE + zOffset;
      var dynamicTexture = new THREEx.DynamicTexture(512, 256);
      var material = new THREE.MeshBasicMaterial({
        map: dynamicTexture.texture
      });

      material.transparent = true;
      dynamicTexture.clear('rgba(0, 0, 0, 0)');
      dynamicTexture.drawTextCooked({
        text: String(year),
        lineHeight: 0.6,
        fillStyle: color,
        align: 'left',
        font: '300 184px Roboto,Arial,sans-serif'
      });

      var geometry = new THREE.PlaneBufferGeometry(256, 128, 4, 4);
      var yearText = new THREE.Mesh(geometry, material);
      yearText.position.x = 0;
      yearText.position.y = 0;
      yearText.position.z = z;
      webglView.scene.add(yearText);
      yearLabels.push(yearText);
    }

    function updateYear(year) {
      var yearDif = year - config.startYear;
      var z = yearDif * YEAR_Z_DISTANCE + CAMERA_Z_DISTANCE + zOffset;

      // update the autoAnimateDirection to keep consistent when it enters
      // in the autoAnimate mode.
      if (z > webglView.camera.position.z) {
        autoAnimateDirection = 1;
      } else {
        autoAnimateDirection = -1;
      }

      if (!autoAnimate) {
        TweenMax.to(webglView.camera.position, 0.5, {
          z: z,
          ease: Power2.easeOut
        });
      }

      if (sliderYear) {
        sliderYear.update(year);
      }
    }

    function getCameraZByYear(year) {
      var yearDif = year - config.startYear;
      return yearDif * YEAR_Z_DISTANCE + CAMERA_Z_DISTANCE + zOffset;
    }

    // Mouse Events
    // use pageX and pageY from Jquery to fix the scroll issue
    function onMouseDown(event) {
      // mouse.x = (event.clientX / webglView.$dom.width()) * 2 - 1;
      // mouse.y = -(event.clientY / webglView.$dom.height()) * 2 + 1;
      //
      mouse.x = (event.pageX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.pageY / webglView.$dom.height()) * 2 + 1;
      webglView.camera.updateMatrixWorld();
      webglView.raycaster.setFromCamera(mouse, webglView.camera);

      event.preventDefault();
      var intersects = webglView.raycaster.intersectObjects(
        webglView.itemsList);

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        if (obj.name === 'thumb') {
          disableInteraction();
          openItemView(obj);
        }
      }
    }

    function onMouseMove(event) {
      var rx = -(window.innerWidth * 0.5 - event.clientX) * 0.75;
      var ry = (window.innerHeight * 0.5 - event.clientY) * 0.75;
      event.preventDefault();

      TweenMax.to(webglView.camera.position, 0.4, {
        x: rx,
        y: ry,
        ease: Power1.easeOut
      });
      mouse.x = (event.pageX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.pageY / webglView.$dom.height()) * 2 + 1;
    }

    function onMousewheel(event) {
      var inc = (event.originalEvent.deltaY > 0 ? 1 : -1);
      autoAnimate = false;
      controller.updateYear(model.getYear() + inc);

      // change the autoAnimateDirection to be consistent with the wheel move
      autoAnimateDirection = inc;

      clearTimeout(mousewheelTimer);

      mousewheelTimer = setTimeout(function() {
        autoAnimate = true;
      }, 1000);
    }

    function onKeyDown(event) {
      switch (event.keyCode) {
        case 40: // up
          webglView.camera.position.z -= 1;
          break;
        case 38: // down
          webglView.camera.position.z += 1;
          break;
        default:
          // nothing
      }
    }

    function enableInteraction() {
      webglView.$dom.on('mousedown', onMouseDown);
      webglView.$dom.on('mousemove', onMouseMove);
      webglView.$dom.on('wheel', onMousewheel);
      sliderYear.enableInteraction();
      window.addEventListener('keydown', onKeyDown, false);
    }

    function disableInteraction() {
      webglView.$dom.off('mousemove', onMouseMove);
      webglView.$dom.off('mousedown', onMouseDown);
      webglView.$dom.off('wheel', onMousewheel);
      sliderYear.disableInteraction();
      window.removeEventListener('keydown', onKeyDown, false);
    }

    // Model Signals

    function modelYearChanged(year) {
      updateYear(year);
    }
  };
})(window.sl.loom, window.sl.loom.models.configModel);
