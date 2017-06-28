(function(app, config) {
  'use strict';

  app.views.map.Map3d = function(webglView, model) {
    var scope = this;

    var controller;
    var areaRecordsClicked = new signals.Signal();
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();

    // map
    var ready = false;
    var frozen = false;

    // fixed values
    var camDistance = 1650;
    var maxElevation = 350;
    var planeSize = 1024;
    var topGlobalAlphaMax = 0.7;
    var topGlobalAlphaMin = 0.1;

    // set the material color of the bottom shader
    var bottomBrightness = 0.65; // r, g, b will have this value

    // set the opacity of the cbd map
    var mapOpacity = 0.35;

    // images & textures
    var mapImageUrl = 'images/map/map.png';
    var heightmapImageUrl = 'images/map/heightmap.png';
    var areamapImageUrl = 'images/map/areas.png';
    var heightmapTexture = new THREE.Texture(undefined);
    var areamapTexture = new THREE.Texture(undefined);
    var cbdMapTexture = new THREE.Texture(undefined);

    // 3d variables
    var areaImageData;
    var areas = [];
    var areasData;
    var attributes;
    var bottomGradientMesh;
    var bottomUniforms;
    var bottomWireframeMesh;
    var bufferAttr;
    var cbdMapMesh;
    var colors = {};
    var comparisonMode = 'all'; // posiible values: all / individual
    var container = new THREE.Object3D();
    var controls;
    var currentAreaIndex = -1; // -1 equals no area selected
    var defines; // = { NUM_AREAS: areasData.length }; // shader Defines
    var domElement = webglView.renderer.domElement;
    var geometry;
    var hoverAreaIndex = -1; // -1 equals no area selected
    var hoverEnabled = true;
    var mouse = new THREE.Vector2(0, 0);
    var previousClick;
    var raycaster = new THREE.Raycaster();
    var segments = 64;
    var topGradientMesh;
    var topUniforms;
    var topWireframeMesh;
    var twColor; // TweenMax Instance
    var validRGBList = [];

    var introMotionCompleted = false;
    var sideViewMotionCompleted = false;
    var sideViewLimitY = 20;
    var currentView = 'top';

    return {
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      destroy: destroy,
      render: render,
      resize: resize,
      setController: setController,
      update: update,
      areaRecordsClicked: areaRecordsClicked,
      freeze: freeze,
      getCurrentHtmlLabel: getCurrentHtmlLabel
    };

    // Public Methods

    function setController(value) {
      controller = value;
    }

    function getCurrentHtmlLabel() {
      if (currentAreaIndex !== -1) {
        return areas[currentAreaIndex].getHtmlLabel();
      }

      return null;
    }

    function freeze(value) {
      controls.enabled = !value;
      frozen = value;

      if (value) {
        disableInteraction();
      } else {
        container.rotation.x = 0;
        container.rotation.y = 0;
        container.rotation.z = 0;
        enableInteraction();
      }
    }

    function intro() {
      var a = model.getData();
      areasData = [];
      introMotionCompleted = false;

      for (var k in a) {
        if (a[k].color) {
          areasData.push(a[k]);
        }
      }

      loadImages();
    }

    function intro2() {
      var time = Math.abs(camDistance - webglView.camera.position.z) *
        0.0001;
      ready = true;
      time = Math.max(time, 1.0);
      container.position.z = -camDistance * 4;
      container.rotation.x = Math.PI / 2;

      TweenMax.to(webglView.camera.rotation, time, {
        x: 0,
        delay: 0.1,
        ease: Power2.easeOut
      });

      TweenMax.to(container.position, time, {
        z: 0,
        ease: Power2.easeOut
      });

      TweenMax.to(webglView.camera.position, time, {
        x: 0,
        y: 0,
        z: camDistance,
        ease: Power2.easeOut,
        onComplete: intro3
      });
    }

    function intro3() {
      var time = 1.5;
      // calculations based on OrbitControls to keep the distance of the camera
      // consistant
      // numbers taken from OrbitControls.js in run time
      var theta = 0.650407854063511;
      var phi = 1.0471975511965976;

      model.yearChanged.add(onModelYearChange);
      update(model.getYear());

      TweenMax.to(container.rotation, time, {
        x: 0,
        delay: 1.0,
        ease: Power1.easeOut
      });

      TweenMax.to(webglView.camera.position, time, {
        x: Math.sin(phi) * camDistance * Math.sin(theta),
        y: Math.cos(phi) * camDistance,
        z: Math.sin(phi) * camDistance * Math.cos(theta),
        delay: 1.0,
        ease: Power1.easeOut,
        onUpdate: updateCameraLookAt,
        onComplete: function() {
          createOrbitControls();
          enableInteraction();
          introMotionCompleted = true;
          introCompleted.dispatch();
        }
      });
    }

    function outro() {
      // TODO: need to cancel all tweens and timers
      disableInteraction();
      model.yearChanged.remove(onModelYearChange);
      controls.enabled = false;

      // set the current area to -1 so the alpha can work
      if (hoverAreaIndex !== -1) {
        areas[hoverAreaIndex].hideLabel();
        topUniforms.currentArea.value = -1;
        bottomUniforms.currentArea.value = -1;
      }

      TweenMax.to(topUniforms.globalAlpha, 1.0, {
        value: 0
      });

      TweenMax.to(bottomUniforms.globalAlpha, 1.0, {
        value: 0
      });

      TweenMax.to(container.position, 2, {
        z: -webglView.camera.far - 1000,
        ease: Power2.easeInOut,
        onUpdate: function() {
          webglView.camera.lookAt(container.position);
        },
        onComplete: function() {
          outroCompleted.dispatch();
        }
      });

      var dx = (webglView.camera.position.x > 0) ? camDistance : -camDistance;

      TweenMax.to(webglView.camera.position, 2.0, {
        y: camDistance,
        // z: camDistance,
        x: dx,
        ease: Power2.easeInOut
      });
    }

    function destroy() {
      controller = null;
      introCompleted.dispose();
      introCompleted = null;
      outroCompleted.dispose();
      outroCompleted = null;
      twColor.kill();

      TweenMax.killTweensOf(webglView.camera.position);
      TweenMax.killTweensOf(topUniforms.globalAlpha);
      TweenMax.killTweensOf(bottomUniforms.globalAlpha);
      TweenMax.killTweensOf(controls);

      disableInteraction();

      areas.forEach(function(area) {
        area.destroy();
      });

      areas = [];

      controls.destroy();
      controls = null;

      container.remove(topWireframeMesh);
      topWireframeMesh.geometry.dispose();
      topWireframeMesh.material.dispose();
      topWireframeMesh = null;

      container.remove(topGradientMesh);
      topGradientMesh.geometry.dispose();
      topGradientMesh.material.dispose();
      topGradientMesh = null;

      container.remove(bottomWireframeMesh);
      bottomWireframeMesh.geometry.dispose();
      bottomWireframeMesh.material.dispose();
      bottomWireframeMesh = null;

      container.remove(bottomGradientMesh);
      bottomGradientMesh.geometry.dispose();
      bottomGradientMesh.material.dispose();
      bottomGradientMesh = null;

      container.remove(cbdMapMesh);
      cbdMapMesh.geometry.dispose();
      cbdMapMesh.material.dispose();
      cbdMapMesh = null;

      webglView.scene.remove(container);
      container = null;

      heightmapTexture.dispose();
      heightmapTexture = null;

      areamapTexture.dispose();
      areamapTexture = null;

      cbdMapTexture.dispose();
      cbdMapTexture = null;

      geometry.dispose();

      areaImageData = [];

      domElement = null;
      scope = null;

      topUniforms = null;
      bottomUniforms = null;
      attributes = null;
      colors = null;
    }

    function render() {
      if (!ready) {
        return;
      }

      if (frozen) {
        container.lookAt(webglView.camera.position);
        return;
      }

      if (webglView.camera.position.y < 400 && introMotionCompleted) {
        // make bottom shader visible
        bottomUniforms.globalAlpha.value = ((400.0 - webglView.camera.position
          .y) / 400.0) / 2.0;
      } else {
        bottomUniforms.globalAlpha.value += (0 - bottomUniforms.globalAlpha
          .value) * 0.25;
      }

      if (currentAreaIndex !== -1) {
        areas[currentAreaIndex].updateLabelPosition2D(webglView.camera);
      }

      if (sideViewMotionCompleted) {
        // get out of sideView and close the htmlLabel
        if (webglView.camera.position.y > sideViewLimitY &&
          currentAreaIndex !== 1) {
          selectArea(-1);
        } else {
          // show bottom elevations
          bottomUniforms.globalAlpha.value = (1 - bottomUniforms.globalAlpha
            .value) * 0.2;
        }
      }

      webglView.camera.updateMatrixWorld();
    }

    function resize() {
      if (frozen) {
        return;
      }

      if (currentAreaIndex !== -1) {
        areas[currentAreaIndex].updateLabelPosition2D(webglView.camera);
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // Private Methods
    // //////////////////////////////////////////////////////////////////////////

    function setComparisonMode(value) {
      if (value !== comparisonMode) {
        comparisonMode = value;

        var year = model.getYear();
        var y = year - config.startYear;
        var yearIndex = Math.floor(y / config.gapYear);

        areas.forEach(function(area) {
          area.comparisonMode = value;
          var items = model.getItemsByAreaAndYearGap(area.data.id,
            yearIndex);
          var hasRecords = items.length > 0;
          area.updateDataByYear(year - year % config.gapYear, yearIndex,
            hasRecords);
        });
      }
    }

    function update(year) {
      year = Math.max(config.startYear, Math.min(config.endYear, year));
      var y = year - config.startYear;
      var yearIndex = Math.floor(y / config.gapYear);

      // update all instances
      areasData.forEach(function(obj, index) {
        var area = areas[index];
        var items = model.getItemsByAreaAndYearGap(area.data.id,
          yearIndex);
        var hasRecords = items.length > 0;
        area.updateDataByYear(year - year % config.gapYear, yearIndex,
          hasRecords);

        // these numbers suppose to be static on the json, but for now they are being calculated.
        area.updateImageCount(model.getItemsByAreaAndYearGap(area.data.id,
          yearIndex).length);
      });

      var color = config.colorsByYear[yearIndex];
      var obj = {};
      var scopeColor = {
        color: topUniforms.currentColor.value.getHex()
      };

      obj.colorProps = {
        color: color
      };

      obj.onUpdate = function() {
        topUniforms.currentColor.value.setStyle(scopeColor.color);
        areasData.forEach(function(obj, index) {
          areas[index].setColor(scopeColor.color);
        });
      };

      if (twColor) {
        twColor.kill();
      }

      twColor = TweenMax.to(scopeColor, 1, obj);
    }

    function enableInteraction() {
      // domElement.addEventListener('click', onClick, false);
      if (currentView === 'top') {
        domElement.addEventListener('mousedown', onTopViewMouseDown);
      } else {
        domElement.addEventListener('mousedown', onSideViewMouseDown);
      }
      domElement.addEventListener('mousemove', onMouseMove, false);
    }

    function disableInteraction() {
      // domElement.removeEventListener('click', onClick);
      domElement.removeEventListener('mousedown', onTopViewMouseDown);
      domElement.removeEventListener('mouseup', onTopViewMouseUp);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mousedown', onSideViewMouseDown);
      domElement.removeEventListener('mouseup', onSideViewMouseUp);
    }

    function setup() {
      setupAreas();
      setupShaderProperties();

      geometry = new THREE.PlaneBufferGeometry(planeSize, planeSize,
        segments - 1, segments - 1);
      geometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI / 2));

      bufferAttr = new THREE.BufferAttribute(attributes.areaIndexByColor.value,
        1);
      geometry.addAttribute('areaIndexByColor', bufferAttr);

      analyzeAreasAndHeightMap();
      createTopElements();
      createBottomElements();
      createLabelsAndLinesByArea();
      createCBDMap();

      webglView.scene.add(container);

      intro2();
    }

    function createOrbitControls() {
      controls = new THREE.OrbitControls(webglView.camera, webglView.renderer
        .domElement);
      // make the min and max to be the same, we are not using zppm
      controls.minDistance = camDistance;
      controls.maxDistance = camDistance;
      controls.noZoom = true;
      controls.minPolarAngle = 0; // radians
      controls.maxPolarAngle = Math.PI / 3; // radians Math.PI / 2 is half of th screen
      controls.target.copy(container.position);
      controls.update();
    }

    function loadImages() {
      var count = 0;

      // needs to implement the error validation
      var checkImages = function() {
        count++;

        if (count === 3) {
          setup();
        }
      };

      var mapImageLoader = new THREE.TextureLoader();
      mapImageLoader.load(mapImageUrl, function(texture) {
        cbdMapTexture = texture;
        checkImages();
      });

      var heightmapImageLoader = new THREE.TextureLoader();
      heightmapImageLoader.load(heightmapImageUrl, function(texture) {
        heightmapTexture = texture;
        checkImages();
      });

      var areamapImageLoader = new THREE.TextureLoader();
      areamapImageLoader.load(areamapImageUrl, function(texture) {
        areamapTexture = texture;
        checkImages();
      });
    }

    function setupAreas() {
      areasData.forEach(function(obj, index) {
        // convert to string to find it quickly
        validRGBList[index] = '_' + obj.color.r + '_' + obj.color.g +
          '_' + obj.color.b;

        // each area will have an label and line
        var area = new app.views.MapArea(index, maxElevation, obj,
          webglView.camera, webglView.$dom);
        area.comparisonMode = comparisonMode;
        area.recordsBtnClicked.add(onAreaRecordsBtnClick, this);
        areas[index] = area;
      });
    }

    function setupShaderProperties() {
      defines = {
        NUM_AREAS: areasData.length
      };

      // each vertex will have an attribute areaIndexByColor with the index of the area.
      // check analyzeAreasAndHeightMap() to understand what is going on.
      attributes = {
        areaIndexByColor: {
          type: 'f',
          value: new Float32Array(segments * segments)
        }
      };

      // areamapTexture  - is the texture with all areas filled with their
      //                   specific color
      // heighmapTexture - is the height map in grayscale to calculate
      //                   the elevations
      // color{N}        - represents the color for an area
      // color{N}coef    - represents the elevation for an area

      areamapTexture.anisotropy = webglView.renderer.getMaxAnisotropy();
      heightmapTexture.anisotropy = webglView.renderer.getMaxAnisotropy();

      topUniforms = getUniform(areamapTexture, heightmapTexture);
      bottomUniforms = getUniform(areamapTexture, heightmapTexture);

      // save the top and bottom uniforms reference in each area,
      // so the area can update the uniforms and the shader will update
      // the coordinates, colors and alpha.
      areas.forEach(function(obj) {
        obj.topUniforms = topUniforms;
        obj.bottomUniforms = bottomUniforms;
      });
    }

    /**
     * Create the uniform to be used by 2 different ShaderMaterials,
     * top and bottom ( Wire and Gradient Meshes )
     **/
    function getUniform(areamapTexture, heightmapTexture) {
      var u = {
        areamapTexture: {
          type: 't',
          value: areamapTexture
        },
        heightmapTexture: {
          type: 't',
          value: heightmapTexture
        },
        globalAlpha: {
          type: 'f',
          value: 0
        },
        maxElevation: {
          type: 'f',
          value: maxElevation
        },
        currentArea: {
          type: 'f',
          value: currentAreaIndex
        },
        currentColor: {
          type: 'c',
          value: new THREE.Color()
        }
      };

      u.colorCoefs = {
        type: 'fv1',
        value: new Float32Array(areas.length)
      };

      return u;
    }

    function createLabelsAndLinesByArea() {
      var vertices = topWireframeMesh.geometry.attributes.position.array;

      // set peak position from vertices based on area.verticeIndex to get x, y, z;
      areas.forEach(function(obj) {
        obj.peakPosition.x = Math.round(vertices[obj.verticeIndex * 3]);
        obj.peakPosition.y = Math.round(vertices[obj.verticeIndex * 3 +
          1]);
        obj.peakPosition.z = Math.round(vertices[obj.verticeIndex * 3 +
          2]);
      });
    }

    function createTopElements() {
      var shaderMaterial = new THREE.ShaderMaterial({
        blending: THREE.AdditiveBlending,
        depthTest: true,
        defines: defines,
        wireframe: true,
        transparent: true,
        vertexColors: THREE.NoColors,
        uniforms: topUniforms,
        vertexShader: app.views.MapShader.topVertexShader,
        fragmentShader: app.views.MapShader.fragmentShader
      });

      topWireframeMesh = new THREE.Mesh(geometry, shaderMaterial);

      var attr = geometry.getAttribute('areaIndexByColor');
      attr.needsUpdate = true;

      var shaderMaterial2 = new THREE.ShaderMaterial({
        transparent: true,
        vertexColors: THREE.NoColors,
        uniforms: topUniforms,
        // attributes: attributes,
        vertexShader: app.views.MapShader.topVertexShader,
        fragmentShader: app.views.MapShader.fragmentShader,
        defines: defines
      });

      topGradientMesh = new THREE.Mesh(geometry, shaderMaterial2);
      container.add(topGradientMesh);
      container.add(topWireframeMesh);
      topGradientMesh.position.y = 1;
      topWireframeMesh.position.y = 1;

      topUniforms.globalAlpha.value = topGlobalAlphaMax;
    }

    function createBottomElements() {
      // Mirror
      var geometryMirror = new THREE.PlaneBufferGeometry(planeSize,
        planeSize, segments - 1, segments - 1);
      geometryMirror.applyMatrix(new THREE.Matrix4().makeRotationX(Math.PI /
        2));
      geometryMirror.applyMatrix(new THREE.Matrix4().makeRotationY(-Math.PI));
      geometryMirror.addAttribute('areaIndexByColor', bufferAttr);

      // var attr = geometryMirror.getAttribute('areaIndexByColor');
      // attr.needsUpdate = true;

      // make it gray
      // we will not change the bottom color
      // previous value was 0.2
      bottomUniforms.currentColor.value.r = bottomBrightness;
      bottomUniforms.currentColor.value.g = bottomBrightness;
      bottomUniforms.currentColor.value.b = bottomBrightness;

      /**
       * Fixed the transparency glitch!
       *
       * blending : THREE.AdditiveBlending
       * depthTest: false
       */
      var mirrorShaderMaterial = new THREE.ShaderMaterial({
        blending: THREE.AdditiveBlending,
        depthTest: true,
        wireframe: true,
        transparent: true,
        vertexColors: THREE.NoColors,
        uniforms: bottomUniforms,
        vertexShader: app.views.MapShader.bottomVertexShader,
        fragmentShader: app.views.MapShader.fragmentShader,
        defines: defines
      });

      bottomWireframeMesh = new THREE.Mesh(geometryMirror,
        mirrorShaderMaterial);
      bottomWireframeMesh.position.y = -1;
      bottomWireframeMesh.rotation.z = Math.PI;
      container.add(bottomWireframeMesh);

      var mirrorShaderMaterial2 = new THREE.ShaderMaterial({
        transparent: true,
        vertexColors: THREE.NoColors,
        uniforms: bottomUniforms,
        vertexShader: app.views.MapShader.bottomVertexShader,
        fragmentShader: app.views.MapShader.fragmentShader,
        defines: defines
      });

      bottomGradientMesh = new THREE.Mesh(geometryMirror,
        mirrorShaderMaterial2);
      bottomGradientMesh.position.y = -1;
      bottomGradientMesh.rotation.z = Math.PI;
      container.add(bottomGradientMesh);
    }

    function createCBDMap() {
      var cbdMapGeometry = new THREE.PlaneBufferGeometry(planeSize,
        planeSize, 15, 15);
      cbdMapGeometry.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI /
        2));
      cbdMapTexture.anisotropy = webglView.renderer.getMaxAnisotropy();
      var cbdMaterial = new THREE.MeshBasicMaterial({
        map: cbdMapTexture,
        side: THREE.FrontSide
      });
      cbdMaterial.opacity = mapOpacity;
      cbdMaterial.transparent = true;
      cbdMapMesh = new THREE.Mesh(cbdMapGeometry, cbdMaterial);
      container.add(cbdMapMesh);
    }

    /**
     * Analyze the height-map.png and areas.png to create the areas by color.
     * Note that each area has a different color in areas.png
     * The verticeIndex for each area represents the point in the geometry.
     *
     *
     */
    function analyzeAreasAndHeightMap() {
      var i;
      // reduce the image size to segments size
      var heightmapImageData = app.utils.CanvasUtils.getImageDataFromTexture(
        heightmapTexture, segments, segments);
      var j;
      var l;
      var index;

      areaImageData = app.utils.CanvasUtils.getImageDataFromTexture(
        areamapTexture, segments, segments);

      for (i = 0, j = 0, l = areaImageData.length; i < l; i += 4, j++) {
        var str = '_' + areaImageData[i] + '_' + areaImageData[i + 1] + '_' +
          areaImageData[i + 2];
        index = validRGBList.indexOf(str);
        attributes.areaIndexByColor.value[j] = index;

        if (validRGBList.indexOf(str) > -1) {
          var height = heightmapImageData[i];

          if (colors[str] === undefined) {
            colors[str] = [];
          }

          if (height > areas[index].height) {
            // update the pinsPosition with new Height and save the verticeIndex
            // to get the x, y, z later
            areas[index].height = height;
            areas[index].verticeIndex = j;
          }

          colors[str].push(j);
        }
      }
    }

    function checkAreaHover() {
      var intersections = raycaster.intersectObject(topWireframeMesh);
      var intersection = (intersections.length) > 0 ? intersections[0] :
        null;

      if (intersection !== null) {
        var pt = intersections[0].point;

        pt.x += planeSize / 2;
        pt.z += planeSize / 2 + Math.abs(container.position.z);
        pt.divideScalar(planeSize / segments);

        var cols = Math.min(Math.round(pt.x), segments);
        var rows = Math.min(Math.round(pt.z), segments);
        var index = Math.floor(cols + (rows * segments)) * 4;
        var r = areaImageData[index];
        var g = areaImageData[index + 1];
        var b = areaImageData[index + 2];
        var areaIndex = validRGBList.indexOf('_' + r + '_' + g + '_' + b);

        hoverArea(areaIndex);

        if (hoverAreaIndex !== -1) {
          domElement.style.cursor = 'pointer';
        } else {
          domElement.style.cursor = 'auto';
        }
      } else {
        domElement.style.cursor = 'auto';
      }
    }

    function selectArea(areaIndex) {
      if (currentAreaIndex !== areaIndex) {
        disableInteraction();

        sideViewMotionCompleted = false;

        var oldIndex = currentAreaIndex;
        currentAreaIndex = areaIndex;

        if (areaIndex !== topUniforms.currentArea.value) {
          if (areas[areaIndex] !== undefined) {
            areas[areaIndex].updateLabelPosition2D(webglView.camera);
          }

          topUniforms.currentArea.value = areaIndex;
          bottomUniforms.currentArea.value = areaIndex;
        }

        if (oldIndex !== -1) {
          areas[oldIndex].hideLabel();
        }

        if (areaIndex !== -1) {
          // go to side view and show label for the area selected.
          hoverEnabled = false;
          domElement.style.cursor = 'auto';
          areas[areaIndex].showLabel();
          TweenMax.to(topUniforms.globalAlpha, 0.4, {
            value: topGlobalAlphaMin,
            ease: Power1.easeOut
          });

          sideView();
        } else {
          currentView = 'top';

          hoverAreaIndex = -1;
          hoverEnabled = true;
          TweenMax.to(topUniforms.globalAlpha, 0.4, {
            value: topGlobalAlphaMax,
            ease: Power1.easeIn
          });

          TweenMax.to(controls, 1, {
            maxPolarAngle: Math.PI / 3,
            minPolarAngle: 0,
            ease: Power2.easeInOut,
            onUpdate: updateCameraLookAt,
            onComplete: function() {
              enableInteraction();
            }
          });
        }
      }
    }

    function hoverArea(areaIndex) {
      var oldIndex;

      if (hoverAreaIndex !== areaIndex) {
        oldIndex = hoverAreaIndex;

        if (areaIndex !== topUniforms.currentArea.value) {
          if (areas[areaIndex] !== undefined) {
            areas[areaIndex].updateLabelPosition2D(webglView.camera);
          }

          topUniforms.currentArea.value = areaIndex;
          bottomUniforms.currentArea.value = areaIndex;
        }

        if (oldIndex !== -1) {
          areas[oldIndex].hideLabel();
        }

        if (areaIndex !== -1) {
          areas[areaIndex].showLabel();
          TweenMax.to(topUniforms.globalAlpha, 0.4, {
            value: topGlobalAlphaMin,
            ease: Power2.easeOut
          });
        } else {
          TweenMax.to(topUniforms.globalAlpha, 0.4, {
            value: topGlobalAlphaMax,
            ease: Power2.easeIn
          });
        }

        hoverAreaIndex = areaIndex;
      }
    }

    function updateCameraLookAt() {
      if (currentAreaIndex !== -1) {
        areas[currentAreaIndex].updateLabelPosition2D(webglView.camera);
      }

      webglView.camera.lookAt(container.position);

      if (controls) {
        controls.update();
      }
    }

    function sideView() {
      // var p1 = new THREE.Vector2(0, 0);
      // var p2 = new THREE.Vector2(webglView.camera.position.x, webglView.camera.position.z);
      // var angle = Math.atan2(p2.y, p2.x) - Math.atan2(p1.y, p1.x);

      // change the limit on the view
      // controls.maxPolarAngle = Math.PI / 2;
      currentView = 'side';
      controls.enabled = false;

      TweenMax.to(controls, 1, {
        maxPolarAngle: Math.PI / 2,
        minPolarAngle: Math.PI / 2,
        ease: Power2.easeInOut,
        onUpdate: function() {
          updateCameraLookAt();
          controls.update();
        },
        onComplete: function() {
          setComparisonMode('individual');

          if (currentAreaIndex !== -1) {
            areas[currentAreaIndex].showDetails();
          }

          sideViewMotionCompleted = true;
          controls.enabled = true;
          enableInteraction();
        }
      });

      // domElement.addEventListener('mousedown', onSideViewMouseDown, false);
    }

    // //////////////////////////////////////////////////////////////////////////
    // Signals Handlers
    // //////////////////////////////////////////////////////////////////////////

    function onModelYearChange(year) {
      update(year);
    }

    function onAreaRecordsBtnClick(target) {
      areaRecordsClicked.dispatch(target.data);
    }

    // //////////////////////////////////////////////////////////////////////////
    // Mouse Events
    // //////////////////////////////////////////////////////////////////////////

    function onSideViewMouseDown(event) {
      // exits side view, enable vertical drag
      previousClick = {
        event: event,
        time: Date.now()
      };
      domElement.addEventListener('mouseup', onSideViewMouseUp, false);
    }

    function onSideViewMouseUp(event) {
      domElement.removeEventListener('mouseup', onSideViewMouseUp);

      if (previousClick && (Date.now() - previousClick.time) < 300) {
        event.preventDefault();
        domElement.removeEventListener('mousedown', onSideViewMouseDown);
        selectArea(-1);
      }
      // domElement.removeEventListener( 'mousedown', onSideViewMouseDown );
    }

    function onTopViewMouseDown(event) {
      // event.preventDefault();
      previousClick = {
        event: event,
        time: Date.now()
      };
      domElement.addEventListener('mouseup', onTopViewMouseUp, false);
    }

    function onTopViewMouseUp(event) {
      domElement.removeEventListener('mouseup', onTopViewMouseUp, false);
      if (hoverEnabled && previousClick &&
        (Date.now() - previousClick.time) < 300) {
        if (hoverAreaIndex !== -1) {
          event.preventDefault();
          domElement.removeEventListener('mousedown', onTopViewMouseDown);
          selectArea(hoverAreaIndex);
        }
      }
    }

    function onMouseMove(event) {
      mouse.x = (event.pageX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.pageY / webglView.$dom.height()) * 2 + 1;

      if (hoverEnabled) {
        webglView.camera.updateMatrixWorld();
        raycaster.setFromCamera(mouse, webglView.camera);
        checkAreaHover();

        if (hoverAreaIndex !== -1) {
          var area = areas[hoverAreaIndex];
          area.updateLabelPosition2D(webglView.camera);
        }
      }
    }
  };
}(window.sl.loom, window.sl.loom.models.configModel));
