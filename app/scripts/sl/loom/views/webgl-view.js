(function(app, config) {
  'use strict';

  app.views.WebglView = View;

  function View(model, initialAssetsService) {
    // variables
    var camera;
    var renderer;
    var scene;
    var itemsDict = {}; // object with arrays with markers as keys
    var itemsList = [];
    var pointLight;
    var raycaster;
    var itemsCreated = new signals.Signal();

    // returning the VM object so we can add more properties to the returned
    // .camera
    // .renderer
    // .$dom : jquery Object with renderer.domElement
    //
    var vm = {
      calculateCameraDistance: calculateCameraDistance,
      getItemById: getItemById,
      init: init,
      itemsCreated: itemsCreated,
      itemsDict: itemsDict,
      itemsList: itemsList,
      render: render,
      resize: resize,
      setBackgroundColor: setBackgroundColor
    };

    return vm;

    // Public Methods

    function setBackgroundColor(color) {
      var scopeColor = {color: scene.fog.color.getHex()};
      var obj = {};
      obj.colorProps = {
        color: color
      };
      obj.ease = Power1.easeOut;

      obj.onUpdate = function() {
        renderer.setClearColor(scopeColor.color);
        scene.fog.color.setStyle(scopeColor.color);
      };

      if (renderer && scene) {
        TweenMax.to(scopeColor, 4, obj);
      }
    }

    function calculateCameraDistance() {
      var dom = $(renderer.domElement);
      var vFOV = camera.fov * (Math.PI / 180); // convert VERTICAL fov to radians
      var targetZ = dom.height() / (2 * Math.tan(vFOV / 2));

      return targetZ;
    }

    function getItemById(itemId) {
      for (var i = 0; i < itemsList.length; i++) {
        if (itemsList[i].data.itemId === itemId) {
          return itemsList[i];
        }
      }

      return null;
    }

    function init() {
      create3d();
      createCamera();
      createLight();
      createItems();
      resize();
    }

    function render() {
      pointLight.position.copy(camera.position);
      pointLight.position.z -= 500;
      renderer.render(scene, camera);
    }

    function resize() {
      var w = Math.max(window.innerWidth, config.windowMinWidth);
      var h = Math.max(window.innerHeight, config.windowMinHeight);
      camera.aspect = w / h;
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      camera.updateProjectionMatrix();
    }

    // Private Methods
    function create3d() {
      scene = new THREE.Scene();
      vm.scene = scene;
      scene.fog = new THREE.Fog(config.backgroundDark1, 1000, 15000);
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        precision: 'mediump'
      });
      renderer.setClearColor(config.backgroundDark1);
      renderer.setPixelRatio(window.devicePixelRatio);
      vm.renderer = renderer;
      vm.$dom = $(renderer.domElement);
      document.body.appendChild(renderer.domElement);
    }

    function createLight() {
      pointLight = new THREE.PointLight(0xe0e0de, 2, 10000);
      pointLight.rotation.x = THREE.Math.degToRad(-90);
      vm.pointLight = pointLight;
      scene.add(pointLight);
    }

    function createCamera() {
      raycaster = new THREE.Raycaster();
      vm.raycaster = raycaster;
      var aspect = window.innerWidth / window.innerHeight;
      camera = new THREE.PerspectiveCamera(45, aspect, 500, 15000);
      camera.position.z = -1000;
      camera.position.y = 1000;
      camera.position.x = 0;
      vm.camera = camera;
    }

    function createItems() {
      var tunnelItemsData = model.getTunnelItemsData();
      tunnelItemsData.forEach(function(data) {
        createThumb(data);
      });

      // sort list by date
      itemsList.sort(function(a, b) {
        return a.data.year - b.data.year;
      });

      itemsCreated.dispatch();
    }

    function createThumb(thumbData) {
      // this texture will be preloaded
      // check the controller loadInitialAssets();
      var texture = initialAssetsService.getTexture(thumbData.thumbUrl);
      var material = new THREE.MeshBasicMaterial({map: texture});
      var geometry = new THREE.PlaneBufferGeometry(config.thumbWidth,
        config.thumbHeight, 2, 2);
      var thumb = new THREE.Mesh(geometry, material);
      thumb.data = thumbData;
      thumb.name = 'thumb';
      thumb.position.x = 0;
      thumb.position.z = 0;
      thumb.position.y = 0;
      thumb.visible = false;
      scene.add(thumb);

      if (itemsDict[thumbData.area] === undefined) {
        itemsDict[thumbData.area] = {list: []};
      }

      itemsList.push(thumb);
      itemsDict[thumbData.area].list.push(thumb);
    }
  }
})(window.sl.loom, window.sl.loom.models.configModel);
