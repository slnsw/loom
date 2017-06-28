(function(app, config) {
  'use strict';

  /**
   * Subview - ItemView
   *
   * @param {Object} webglView       [WebGLView]
   * @param {Object} selectedItem    [Mesh]
   * @param {Array} relatedItemsData [List of objects]
   * @return {Object}                Public methods
   */
  app.views.ItemView = function(webglView, selectedItem, relatedItemsData) {
    // animation signals
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();

    // mouse click signals
    var relatedItemClicked = new signals.Signal();
    var tagClicked = new signals.Signal();
    var backgroundThumbClicked = new signals.Signal();
    var backgroundClicked = new signals.Signal();

    var $loading = $('.image-preloader');
    // var state = 'front';
    var cameraYDifFront = -64;
    var container;
    var mouse = new THREE.Vector2(0, 0);
    var relatedItems = [];
    var scaleCoef;

    var imageObj;
    // var imageObjRotationY = 0;
    var maxImageWidth = 840;
    var maxImageHeight = 640;
    var imageWidth = maxImageWidth;
    var imageHeight = 480;
    var relatedThumbsSpace = 10;
    var width = 0;
    var height = 0;

    var layout;
    // var favoritesService = new app.services.FavoritesService();

    var itemDetails = new app.views.ItemDetails(selectedItem.data);

    relatedItemsData = relatedItemsData || [];

    return {
      backgroundClicked: backgroundClicked,
      backgroundThumbClicked: backgroundThumbClicked,
      destroy: destroy,
      getSelectedItem: getSelectedItem,
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      relatedItemClicked: relatedItemClicked,
      render: render,
      resize: resize,
      tagClicked: tagClicked
    };

    function getSelectedItem() {
      return selectedItem;
    }

    function intro() {
      app.services.GAService.pageview('/item-details', selectedItem.data.title);
      loadImage();
    }

    function outro() {
      hideLoading();
      disableInteraction();
      hideRelatedItems();

      TweenMax.to(webglView.camera.position, 1, {
        x: selectedItem.position.x,
        y: selectedItem.position.y,
        ease: Power2.easeOut
      });

      // fade in the big image
      if (imageObj) {
        TweenMax.to(imageObj.material, 0.5, {
          opacity: 0,
          ease: Power2.easeOut,
          delay: 0.5
        });
      }

      // scale down image
      if (container) {
        TweenMax.to(container.scale, 0.4, {
          x: config.thumbWidth / imageWidth,
          y: config.thumbHeight / imageHeight,
          ease: Power2.easeOut,
          delay: 0.5,
          onComplete: function() {
            container.visible = false;
          }
        });
      }

      selectedItem.visible = true;

      // scale thumb to the original size
      TweenMax.to(selectedItem.scale, 0.5, {
        x: 1,
        y: 1,
        ease: Power2.easeOut,
        delay: 0.5
      });

      TweenMax.to(selectedItem.material, 0.5, {
        opacity: 1,
        ease: Power2.easeOut,
        delay: 0.5,
        onComplete: function() {
          outroCompleted.dispatch();
        }
      });

      itemDetails.outro();
    }

    function destroy() {
      itemDetails.destroy();
      itemDetails = null;
      introCompleted.dispose();
      outroCompleted.dispose();
      relatedItemClicked.dispose();
      tagClicked.dispose();
      backgroundClicked.dispose();
      backgroundThumbClicked.dispose();

      relatedItems.forEach(function(item) {
        webglView.scene.remove(item);
      });

      relatedItems = [];

      webglView.scene.remove(container);
      container = null;
    }

    function render() {
      webglView.camera.updateMatrixWorld();
    }

    function resize() {
      var camDist = webglView.calculateCameraDistance();
      webglView.camera.position.z = selectedItem.position.z + camDist;
      if (itemDetails) {
        itemDetails.resize();
      }
    }

    // Private Methods

    function loadImage() {
      showLoading(function() {
        new THREE.TextureLoader().load(
          selectedItem.data.imageUrl,
          function(texture) {
            hideLoading(function() {
              onImageLoad(texture);
            });
          }, function() {
            // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
          }, function() {
            // IMPLEMENT ERROR BEHAVIOUR HERE!!!
            // it will use a solid color
            console.error('Image not loader', selectedItem.data.imageUrl);
            onImageLoad(null);
          }
        );
      });
    }

    function onImageLoad(texture) {
      texture.minFilter = THREE.LinearFilter;

      createElements(texture);
      createRelatedItems();

      calculateSize();
      calculateScaleCoef();

      cameraYDifFront = 0; // (relatedItemsData.length > 0) ? -64 : 0;

      imageObj.visible = true;

      selectedItem.material.opacity = 1;
      selectedItem.material.needsUpdate = true;

      // fade in the big image
      TweenMax.to(selectedItem.material, 0.5, {
        opacity: 0,
        ease: Power2.easeInOut,
        delay: 0.5
      });

      // scale up the thumb to match big image's size
      TweenMax.to(selectedItem.scale, 0.5, {
        x: imageWidth / config.thumbWidth,
        y: imageHeight / config.thumbHeight,
        ease: Power2.easeInOut,
        delay: 0.5
      });

      imageObj.material.opacity = 0;
      imageObj.material.needsUpdate = true;

      // fade in the big image
      TweenMax.to(imageObj.material, 0.5, {
        opacity: 1,
        ease: Power2.easeInOut,
        delay: 0.5
      });

      container.scale.x = config.thumbWidth / imageWidth;
      container.scale.y = config.thumbHeight / imageHeight;

      // scale image up
      TweenMax.to(container.scale, 0.5, {
        x: 1,
        y: 1,
        ease: Power2.easeInOut,
        delay: 0.5,
        onComplete: function() {
          selectedItem.visible = false;
          enableInteraction();
          showRelatedItems();

          itemDetails.setup(layout);
          itemDetails.intro(width, height);

          introCompleted.dispatch();
        }
      });

      var offsetX = 0;

      if (layout === 'vertical') {
        offsetX = width * 0.5 - (imageWidth + itemDetails.width) * 0.5;
      } else {
        offsetX = -(width - imageWidth) * 0.5;
      }

      TweenMax.to(webglView.camera.position, 0.5, {
        x: selectedItem.position.x - offsetX,
        y: selectedItem.position.y + cameraYDifFront,
        ease: Power2.easeInOut,
        delay: 0.5
      });

      itemDetails.tagClicked.add(tagClicked.dispatch);
    }

    function createElements(texture) {
      container = new THREE.Object3D();
      container.name = 'imageObj-details';
      container.position.x = selectedItem.position.x;
      container.position.z = selectedItem.position.z + 5;
      container.position.y = selectedItem.position.y;

      var material;
      var scaleX;
      var scaleY;
      var smallerScale;

      if (texture) {
        imageWidth = Math.min(maxImageWidth, texture.image.width);
        imageHeight = Math.min(maxImageHeight, texture.image.height);

        scaleX = imageWidth / texture.image.width;
        scaleY = imageHeight / texture.image.height;

        // smallerScale used to calculate the new size of the image before
        // creating the related thumbs and item details.
        smallerScale = Math.min(scaleX, scaleY);

        if (smallerScale < 1) {
          imageWidth = Math.round(texture.image.width * smallerScale);
          imageHeight = Math.round(texture.image.height * smallerScale);
        }

        layout = (imageWidth > imageHeight) ? 'horizontal' : 'vertical';

        material = new THREE.MeshBasicMaterial({
          map: texture,
          color: 0xffffff,
          transparent: true
        });
      } else {
        layout = 'horizontal';
        material = new THREE.MeshBasicMaterial({
          color: '#333333'
        });
      }

      var geometry = new THREE.PlaneBufferGeometry(imageWidth, imageHeight,
        8, 8);
      imageObj = new THREE.Mesh(geometry, material);
      imageObj.name = 'imageObj';
      material.side = THREE.FrontSide;
      container.add(imageObj);

      webglView.scene.add(container);
      imageObj.visible = false;
    }

    function createRelatedItems() {
      relatedItems = [];
      // limit based on the image height
      var limit = Math.floor(imageHeight / config.thumbHeight);

      if (relatedItemsData.length > limit) {
        relatedItemsData.splice(limit, relatedItemsData.length - limit);
      }

      for (var i = 0; i < relatedItemsData.length; i++) {
        var data = relatedItemsData[i];
        var texture = new THREE.TextureLoader().load(data.thumbUrl);
        texture.minFilter = THREE.LinearFilter;
        var material = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true
        });
        var geometry = new THREE.PlaneBufferGeometry(
          config.thumbWidth, config.thumbHeight, 4, 4);
        var item = new THREE.Mesh(geometry, material);
        item.material.opacity = 0;
        item.data = data;
        item.name = 'related-thumb';
        relatedItems.push(item);
        container.add(item);
      }
    }

    function showRelatedItems() {
      var tbh = config.thumbHeight;
      var tbw = config.thumbWidth;

      var dx;
      var dy = (imageHeight - tbh) * 0.5;

      if (layout === 'horizontal') {
        dx = (imageWidth + tbw) * 0.5 + relatedThumbsSpace;
      } else {
        dx = -((imageWidth + tbw) * 0.5 + relatedThumbsSpace);
      }

      relatedItems.forEach(function(item, index) {
        item.visible = true;
        item.position.z = -1;

        TweenMax.to(item.material, 0.3, {
          opacity: 1,
          delay: index * 0.05,
          ease: Power2.easeInOut
        });
        TweenMax.to(item.position, 0.4, {
          y: dy - index * (tbh + relatedThumbsSpace),
          x: dx,
          delay: index * 0.05,
          ease: Power2.easeOut
        });
      });
    }

    function hideRelatedItems() {
      relatedItems.forEach(function(item, index) {
        // go back to the original position
        TweenMax.to(item.material, 0.3, {
          opacity: 0,
          delay: index * 0.05,
          ease: Power2.easeInOut
        });
        TweenMax.to(item.position, 0.3, {
          z: item.position.z - 200,
          y: imageObj.position.y,
          x: imageObj.position.x,
          delay: index * 0.05,
          ease: Power2.easeInOut,
          onComplete: function() {
            item.visible = false;
          }
        });
      });
    }

    function showLoading(callback) {
      $loading.show();
      TweenMax.to($loading, 0.5, {
        autoAlpha: 1,
        ease: Power2.easeOut,
        onComplete: callback
      });
    }

    function hideLoading(callback) {
      TweenMax.to($loading, 0.4, {
        autoAlpha: 0,
        ease: Power2.easeInOut,
        delay: 0.1,
        onComplete: function() {
          $loading.hide();
          if (callback) {
            callback.apply();
          }
        }
      });
    }

    function enableInteraction() {
      webglView.$dom.on('mousedown', onMouseDown);
    }

    function disableInteraction() {
      webglView.$dom.off('mousedown', onMouseDown);
      // webglView.$dom.off('mousemove', onMouseMove);
    }

    function onMouseDown(event) {
      var intersects;
      var obj;
      event.preventDefault();

      mouse.x = (event.pageX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.pageY / webglView.$dom.height()) * 2 + 1;
      // The guy came from the amazon rainforest to write this line to fix your mouse problem
      webglView.camera.updateMatrixWorld();
      webglView.raycaster.setFromCamera(mouse, webglView.camera);

      intersects = webglView.raycaster.intersectObjects(container.children);

      if (intersects.length > 0) {
        obj = intersects[0].object;

        if (obj.name === 'related-thumb') {
          if (obj.data.itemId) {
            // Related Item clicked
            relatedItemClicked.dispatch(obj.data.itemId);
            return;
          }
        }
      } else {
        // background click
        checkBackgroundClick();
      }
    }

    function checkBackgroundClick() {
      var intersects = webglView.raycaster.intersectObjects(
        webglView.scene.children
      );
      // // Thumb click behind the
      if (intersects.length > 0) {
        var obj = intersects[0].object;

        if (obj.name === 'thumb' && obj.visible) {
          // pass the thumb back
          backgroundThumbClicked.dispatch(obj);
        }
      } else {
        backgroundClicked.dispatch();
      }
    }

    function calculateSize() {
      height = imageHeight;
      width = imageWidth;

      if (relatedItems.length > 0) {
        // need to calculate the width
        width += config.thumbWidth + relatedThumbsSpace;
      }
    }

    function calculateScaleCoef() {
      // the thumb is square so width or height will be the same
      scaleCoef = config.thumbWidth / Math.min(imageWidth, imageHeight);
    }
  };
})(window.sl.loom, window.sl.loom.models.configModel);
