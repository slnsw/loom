(function(app) {
  'use strict';

  app.views.space.particles.ParticlesView = function(webglView, appModel) {
    // public signals
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var particleSelected = new signals.Signal();
    var areaSelected = new signals.Signal();

    // constants
    var MIN_Z = 1000;
    var MAX_Z = 5000;
    var INITIAL_Z = 3000;

    // private variables
    var camera = webglView.camera;
    var controls;
    var controlsChanging = false;
    var currentArea = 'all';
    var hoverSprite;
    var intersects;
    var isGlobalMousePressed = false;
    var isMouseMoving = false;
    var isRunning = false;
    var menu;
    var mouse;
    var particleLabel;
    var particles;
    var raycaster;
    var scene = webglView.scene;
    // var scope = this;
    var selectedParticleSprite;
    var spriteGroup;
    var TopicsService = app.services.TopicsService;
    var year;
    var domElement = webglView.renderer.domElement;
    var userMouse;
    var yearColor = new THREE.Color();
    var yearColors = app.models.configModel.colorsByYear; // clone array

    app.views.space.particles.ParticleSprite.prepareAssets();

    function destroy() {
      appModel.yearChanged.remove(onYearChange);
      disableListeners();

      introCompleted.dispose();
      menu.destroy();
      outroCompleted.dispose();
      particleLabel.destroy();
      particleSelected.dispose();

      if (controls) {
        controls.destroy();
        controls = null;
      }

      for (var i = 0; i < spriteGroup.children.length; i++) {
        spriteGroup.children[i].userData = null;
      }

      scene.remove(spriteGroup);

      app.views.space.particles.ParticleSprite.destroyAssets();

      camera = null;
      hoverSprite = null;
      introCompleted = null;
      menu = null;
      mouse = null;
      outroCompleted = null;
      particleLabel = null;
      particleSelected = null;
      raycaster = null;
      scene = null;
      spriteGroup = null;
      TopicsService = null;
      userMouse = null;
      yearColor = null;
      yearColors = null;
    }

    function pause() {
      if (isRunning) {
        controls.enabled = false;
        menu.close();
        particleLabel.hide();
        hoverSprite = null;
        domElement.style.cursor = 'auto';
        isRunning = false;
        disableListeners();
        appModel.yearChanged.remove(onYearChange);
      }
    }

    function resume() {
      if (!isRunning) {
        controls.enabled = true;

        // force update the year
        appModel.yearChanged.add(onYearChange);
        menu.open();
        isRunning = true;
        onYearChange(appModel.getYear());
        // force the remove listeners
        showAllParticlesExceptSelected();
        disableListeners();
        enableListeners();

        spriteGroup.position.set(0, 0, 0);

        // force render one time more
        webglView.renderer.render(scene, camera);
      }
    }

    function intro() {
      isRunning = true;
      init();
      var diffZ = Math.abs(INITIAL_Z - camera.position.z);
      var cameraTransitionTime = diffZ * 0.0001;
      cameraTransitionTime = Math.max(3, Math.min(cameraTransitionTime, 0.4));

      TweenMax.to(camera.rotation, cameraTransitionTime, {z: 0, y: 0, x: 0});
      TweenMax.to(camera.position, cameraTransitionTime, {
        z: INITIAL_Z,
        y: 0,
        x: 0,
        ease: Power2.easeOut,
        onComplete: function() {
          camera.lookAt(new THREE.Vector3(0, 0, 0));
          showParticles();
          enableListeners();
          introCompleted.dispatch();
        }});
    }

    function showParticles() {
      // round the year to mach the year gap.
      var year = appModel.getYear();
      year -= (year % app.models.configModel.gapYear);
      updateYearColor(year);
      updateSprites(currentArea, year);
      menu.open();
    }

    function outro() {
      appModel.yearChanged.remove(onYearChange);
      hideAllParticles();
      disableListeners();
      setTimeout(outroCompleted.dispatch, 2000);
    }

    function render() {
      if (TweenMax.getAllTweens().length > 0) {
        if (!selectedParticleSprite) {
          raycastSprites();
        }
      } else if (isMouseMoving) {
        isMouseMoving = false;
        if (isGlobalMousePressed) {
          // render if the mouse is down / dragging
          // updateOrbitControls();
          // renderer.render(scene, camera);
        } else {
          // check the raycast if the mouse is not pressed
          // lets save some process
          raycastSprites();
        }
      } else if (controlsChanging) {
        // updateOrbitControls();
        // renderer.render(scene, camera);
        // reset the state
        controlsChanging = false;
      }

      if (!isMouseMoving) {
        spriteGroup.rotation.y += 0.0005 * controls.direction;
      }
    }

    function resize() {
    }

    function init() {
      particles = app.services.TopicsService.uniqueTopicsTotal;
      particleLabel = new app.views.space.ParticleLabel();
      particleLabel.setText(' yooooo');
      menu = new app.views.space.particles.Menu();

      create3d();
      createSprites();
      createMouseControls();
      // render();
    }

    function enableListeners() {
      menu.areaSelected.add(onAreaMenuItemSelected);
      menu.topicClicked.add(onTopTopicsMenuMouseClicked);
      menu.topicHovered.add(onTopTopicsMenuMouseHovered);
      domElement.addEventListener('mousedown', onDocumentMouseDown, false);
      domElement.addEventListener('mouseup', onDocumentMouseUp, false);
      domElement.addEventListener('mouseout', onDocumentMouseUp, false);
      domElement.addEventListener('mousemove', onMouseMove, false);
      domElement.addEventListener('mousewheel', onMouseWheel, false);
      domElement.addEventListener('click', onClick, false);
      appModel.yearChanged.add(onYearChange);
    }

    function disableListeners() {
      menu.areaSelected.remove(onAreaMenuItemSelected);
      menu.topicClicked.remove(onTopTopicsMenuMouseClicked);
      menu.topicHovered.remove(onTopTopicsMenuMouseHovered);
      domElement.removeEventListener('mousedown', onDocumentMouseDown);
      domElement.removeEventListener('mouseup', onDocumentMouseUp);
      domElement.removeEventListener('mouseout', onDocumentMouseUp);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mousewheel', onMouseWheel, false);
      domElement.removeEventListener('click', onClick);
      appModel.yearChanged.remove(onYearChange);
    }

    function create3d() {
      mouse = new THREE.Vector2(0, 0);
      userMouse = new THREE.Vector2(0, 0);
      raycaster = new THREE.Raycaster();
      // scene = webglView.scene;
      // scene = new THREE.Scene();
    }

    function createMouseControls() {
      controls = new app.utils.ObjectRotateControls(spriteGroup,
        webglView.renderer.domElement);
    }

    function showLabel(object, x, y) {
      if (!object) return;
      var area = object.userData.key;
      var yearIndex = appModel.getYearIndex(appModel.getYear());
      var count = object.userData.obj.all[yearIndex];
      var countArea = 0;
      if (object.userData.obj[currentArea] && currentArea !==
        'all') {
        countArea = object.userData.obj[currentArea][yearIndex];
      }

      particleLabel.setPos(x, y);
      particleLabel.setText(area, count, countArea);
      particleLabel.show();
      domElement.style.cursor = 'pointer';
    }

    function updateYearColor(year) {
      var c = yearColors[appModel.getYearIndex(year)];
      menu.updateYearAndColor(year, c);
      yearColor.set(c);
    }

    // ========================================================================
    // Sprites
    // ========================================================================

    function createSprites() {
      var particles = TopicsService.uniqueTopicsTotal;
      spriteGroup = new THREE.Object3D();

      for (var i = 0; i < particles; i++) {
        var key = TopicsService.uniqueTopicsKeys[i];
        var topicObj = TopicsService.uniqueTopicsDict[key];
        var sprite = app.views.space.particles.ParticleSprite
          .createTopicRandomPos(key, topicObj);
        spriteGroup.add(sprite);
      }

      scene.add(spriteGroup);
    }

    function updateSprites(areaId, year) {
      var areaObj;
      var count;
      var countsList = [];
      var offsetHsl;
      var yearIndex = appModel.getYearIndex(year);
      var sprite;
      var len = spriteGroup.children.length;
      var index;

      for (index = 0; index < len; index++) {
        // use only selected area
        sprite = spriteGroup.children[index];
        // selected areas
        areaObj = sprite.userData.obj[currentArea];

        count = 0;
        if (areaObj) {
          count = areaObj[yearIndex];
        }

        if (sprite.userData.currentCount !== count) {
          // recalculate position and scale based on the new counter
          app.views.space.particles.ParticleSprite.update(sprite, count);
        }

        offsetHsl = (count - 100) / 400;
        sprite.material.color.copy(yearColor);
        sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
        sprite.material.needsUpdate = true;
        countsList.push({
          count: count,
          sprite: sprite
        });
      }

      countsList.sort(function(a, b) {
        return b.count - a.count;
      });

      menu.setTopTopicsList(countsList);
    }

    function raycastSprites() {
      var old;
      raycaster.setFromCamera(mouse, camera);

      // check intersections
      intersects = raycaster.intersectObjects(spriteGroup.children);

      if (intersects.length > 0) {
        // get the first object.
        if (hoverSprite !== intersects[0].object &&
          intersects[0].object.visible) {
          old = hoverSprite;

          // keep the != and dont use !== cuz it will not check the null.
          // if (old != null) {
          if (old) {
            app.views.space.particles.ParticleSprite.hoverOff(old, yearColor);
          }

          hoverSprite = intersects[0].object;
          app.views.space.particles.ParticleSprite.hoverOn(hoverSprite,
            yearColor);
          showLabel(hoverSprite, userMouse.x, userMouse.y);
        }

        if (particleLabel) {
          particleLabel.setPos(userMouse.x, userMouse.y);
        }
      } else {
        particleLabel.hide();

        if (hoverSprite) {
          old = hoverSprite;

          if (old) {
            app.views.space.particles.ParticleSprite.hoverOff(old, yearColor);
          }
          hoverSprite = null;
        }
        domElement.style.cursor = 'auto';
      }
    }

    function highlightSpritesByAreaAndYear(currentArea, currentYear) {
      if (currentArea === 'all') {
        return;
      }

      var list = [];
      var yearIndex = appModel.getYearIndex(currentYear);
      spriteGroup.children.forEach(function(item) {
        if (item.userData.obj.hasOwnProperty(currentArea)) {
          // filter current year before add to the list
          if (item.userData.obj[currentArea][yearIndex] > 0) {
            list.push(item);
          }
        }
      });
      list.sort(function(a, b) {
        return b.count - a.count;
      });
      highlightSpritesList(list);
    }

    function highlightSpritesList(list) {
      var item;
      var i;
      for (i = 0; i < list.length; i++) {
        item = list[i];
        item.material.color.setRGB(1, 1, 1);
        item.material.needsUpdate = true;
      }
    }

    function selectParticle(sprite) {
      disableListeners();
      menu.close();
      particleLabel.hide();

      var dest = sprite.position.clone();

      selectedParticleSprite = sprite;
      app.views.space.particles.ParticleSprite.hoverOff(sprite, yearColor);
      particleLabel.hide();

      TweenMax.to(spriteGroup.position, 2, {
        x: -dest.x,
        y: -dest.y,
        z: -dest.z,
        ease: Power2.easeInOut,
        onComplete: function() {
          notifyParticleSelected();
        }
      });

      // short  rotation.y
      spriteGroup.rotation.y %= Math.PI * 2;

      var rotY = 0;
      if (spriteGroup.rotation.y < -Math.PI) {
        rotY = -Math.PI * 2;
      } else if (spriteGroup.rotation.y > Math.PI) {
        rotY = Math.PI * 2;
      }

      TweenMax.to(spriteGroup.rotation, 2, {
        x: String(0),
        y: rotY,
        z: String(0),
        ease: Power2.easeInOut
      });

      hideAllParticlesExceptSelected();

      controls.enabled = false;
    }

    /**
     * Event Handlers
     **/

    function onMouseMove(event) {
      event.preventDefault();
      userMouse.x = event.pageX;
      userMouse.y = event.pageY;

      // normalize between -1 and +1
      mouse.x = (event.pageX / document.body.clientWidth) * 2 - 1;
      mouse.y = -(event.pageY / document.body.clientHeight) * 2 + 1;
      isMouseMoving = true;
    }

    function onDocumentMouseDown() {
      isGlobalMousePressed = true;
    }

    function onDocumentMouseUp() {
      isGlobalMousePressed = false;
    }

    function onMouseWheel(e) {
      var time = 0.1 + Math.min(Math.abs(e.deltaY / 1000), 0.8);
      var z = camera.position.z + (e.deltaY);
      z = Math.min(MAX_Z, Math.max(MIN_Z, z));
      TweenMax.to(camera.position, time, {
        z: z,
        ease: Power2.easeOut
      });
    }

    function onClick() {
      if (hoverSprite) {
        selectParticle(hoverSprite);
      }
    }

    function notifyParticleSelected() {
      particleSelected.dispatch(selectedParticleSprite.userData,
        selectedParticleSprite, camera);
    }

    function hideAllParticlesExceptSelected() {
      var len = spriteGroup.children.length;
      var index;
      var sprite;
      var delay;
      for (index = 0; index < len; index++) {
        // use only selected area
        sprite = spriteGroup.children[index];

        if (sprite !== selectedParticleSprite) {
          // recalculate position and scale based on the new counter
          if (sprite.scale.x <= 6) {
            // hide smal ones! to improve processing
            sprite.visible = false;
          } else {
            var offsetHsl = -100 / 400;
            sprite.material.color.copy(yearColor);
            sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
            sprite.material.needsUpdate = true;
            // sprite.geometry.needsUpdate = true;
            delay = sprite.position.distanceTo(selectedParticleSprite.position);
            app.views.space.particles.ParticleSprite
              .hide(sprite, delay * 0.00025);
          }
        }
      }
    }

    function hideAllParticles() {
      var len = spriteGroup.children.length;
      var index;
      var sprite;
      var delay;
      var point = new THREE.Vector3();

      for (index = 0; index < len; index++) {
        // use only selected area
        sprite = spriteGroup.children[index];

        // recalculate position and scale based on the new counter
        if (sprite.scale.x <= 6) {
          // hide smal ones! to improve processing
          sprite.visible = false;
        } else {
          var offsetHsl = -100 / 400;
          sprite.material.color.copy(yearColor);
          sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
          sprite.material.needsUpdate = true;
          // sprite.geometry.needsUpdate = true;
          delay = sprite.position.distanceTo(point);
          app.views.space.particles.ParticleSprite
            .hide(sprite, delay * 0.00025);
        }
      }
    }

    function showAllParticlesExceptSelected() {
      var len = spriteGroup.children.length;
      var index;
      var sprite;
      var delay;
      for (index = 0; index < len; index++) {
        // use only selected area
        sprite = spriteGroup.children[index];

        if (sprite !== selectedParticleSprite) {
          var offsetHsl = (sprite.userData.currentCount - 100) / 400;
          sprite.material.color.copy(yearColor);
          sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
          sprite.material.needsUpdate = true;
          delay = sprite.position.distanceTo(selectedParticleSprite.position);
          app.views.space.particles.ParticleSprite
            .show(sprite, delay * 0.00025);
        }
      }
    }

    // Custom Event Handlers

    function changeArea(value) {
      if (currentArea !== value) {
        currentArea = value;
        updateSprites(currentArea, appModel.getYear());
        highlightSpritesByAreaAndYear(currentArea, appModel.getYear());
        menu.selectAreaById(currentArea);
      }
    }

    function onYearChange(value) {
      // remove the module make it goes every gapYear =)
      value -= (value % app.models.configModel.gapYear);

      if (value !== year) {
        year = value;
        updateYearColor(value);
        updateSprites(currentArea, value);
        highlightSpritesByAreaAndYear(currentArea, value);
      }
    }

    function onAreaMenuItemSelected(areaId) {
      areaSelected.dispatch(areaId);
    }

    function onTopTopicsMenuMouseHovered(selectedSprite) {
      var size = webglView.renderer.getSize();

      // use matrixWorld because its inside a container and we need the
      // world calculated position and not the internal position
      var pos = convert3dTo2dCoord(
        selectedSprite.matrixWorld,
        camera,
        size.width,
        size.height
      );

      // The global transform of the object. If the Object3d has no parent,
      // then it's identical to the local transform.
      showLabel(selectedSprite, pos.x, pos.y);
    }

    // function onTopTopicsMenuMouseClicked(selectedSprite, spriteList) {
    function onTopTopicsMenuMouseClicked(selectedSprite) {
      selectParticle(selectedSprite);
    }

    function convert3dTo2dCoord(matrixWorld, camera, width, height) {
      var p = new THREE.Vector3();
      p.applyProjection(matrixWorld);
      var vector = p.project(camera);
      vector.x = (vector.x + 1) / 2 * width;
      vector.y = -(vector.y - 1) / 2 * height;
      return vector;
    }

    return {
      destroy: destroy,
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      render: render,
      resize: resize,
      particleSelected: particleSelected,
      pause: pause,
      resume: resume,
      changeArea: changeArea,
      areaSelected: areaSelected
    };
  };
})(window.sl.loom);
