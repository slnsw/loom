(function(app, config) {
  'use strict';
  var MAX_ITEMS = 20;

  app.views.common.RecordsGallery = function(webglView, model, recordList) {
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var itemSelected = new signals.Signal();
    var newItemSelected = new signals.Signal();
    var itemsList = [];
    var camDistance = 1500;
    var camY = 700;
    var thumbSpace = 10;
    var mouse = new THREE.Vector2();
    var dom = webglView.renderer.domElement;
    var currentItem;
    var newItemToSelect;
    var nextButton;
    var previousButton;

    return {
      destroy: destroy,
      disableInteraction: disableInteraction,
      enableInteraction: enableInteraction,
      intro: intro,
      introCompleted: introCompleted,
      itemSelected: itemSelected,
      newItemSelected: newItemSelected,
      deselectItem: deselectItem,
      outro: outro,
      outroCompleted: outroCompleted,
      render: render,
      resize: resize,
      selectNextItem: selectNextItem,
      selectPreviousItem: selectPreviousItem,
      enableItemsNav: enableItemsNav,
      disableItemsNav: disableItemsNav
    };

    // Public Methods

    function intro() {
      var p = new THREE.Vector3(0, 0, 0);

      TweenMax.to(webglView.camera.position, 1, {
        x: 0,
        y: camY - (config.thumbHeight + thumbSpace) * 1.5,
        z: camDistance * 1.8,
        onUpdate: function() {
          p.y = webglView.camera.position.y;
          webglView.camera.lookAt(p);
        },
        onComplete: function() {
          webglView.camera.position.x = Math.round(webglView.camera.position.x);
          webglView.camera.position.y = Math.round(webglView.camera.position.y);
          webglView.camera.position.z = Math.round(webglView.camera.position.z);
          enableInteraction();
          introCompleted.dispatch();
        }
      });
      createButtons();
      createThumbs();
      introThumbs();
    }

    function outro() {
      disableInteraction();
      disableItemsNav();
      outroThumbs();
      setTimeout(outroCompleted.dispatch, itemsList.length * 20 + 600);
    }

    function destroy() {
      document.body.removeChild(nextButton);
      nextButton = null;
      document.body.removeChild(previousButton);
      previousButton = null;
      itemsList.forEach(function(obj) {
        obj.parent.remove(obj);
        obj.material.dispose();
        obj.geometry.dispose();
      });

      itemsList = [];
      newItemSelected.dispose();
      newItemSelected = null;
      itemSelected.dispose();
      itemSelected = null;
      introCompleted.dispose();
      introCompleted = null;
      outroCompleted.dispose();
      outroCompleted = null;
    }

    function render() {
    }

    function resize() {
    }

    function createButtons() {
      nextButton = document.createElement('div');
      nextButton.className = 'records-gallery-button next';
      TweenMax.set(nextButton, {autoAlpha: 0});
      previousButton = document.createElement('div');
      previousButton.className = 'records-gallery-button previous';
      TweenMax.set(previousButton, {autoAlpha: 0});

      document.body.appendChild(previousButton);
      document.body.appendChild(nextButton);
    }

    function createThumbs() {
      var maxItemsPerRow = 7;
      // var itemsPerRow = 7;
      var maxRows = 4;
      // max 20 items
      var len = Math.min(recordList.length, MAX_ITEMS);
      var item;
      var x;
      var y;
      var z;
      var rows;
      var initY = camY + config.thumbHeight;
      var rowHeight = (config.thumbHeight + thumbSpace);
      var initX;

      switch (len) {

        case 6:
        case 7:
        case 8:
        case 10:
        case 11:
        case 12:
        case 13:
        case 14:
          rows = 2;
          break;

        case 9:
        case 15:
        case 17:
        case 18:
          rows = 3;
          break;

        case 16:
        case 19:
        case 20:
          rows = 4;
          break;

        default:
          rows = 1;

      }

      if (rows < maxRows) {
        var dify = ((maxRows - rows) * rowHeight) * 0.5;

        initY -= dify;
      }

      maxItemsPerRow = Math.ceil(len / rows);

      for (var k = 0; k < len; k++) {
        if (k % maxItemsPerRow === 0) {
          // var itemsPerRow = maxItemsPerRow;
          initX = -(maxItemsPerRow * config.thumbWidth +
            (maxItemsPerRow - 1) * thumbSpace) * 0.5 +
            config.thumbWidth * 0.5;
        }

        item = recordList[k];

        z = camDistance * 0.8;
        x = initX + (k % maxItemsPerRow) * (config.thumbWidth + thumbSpace);
        y = initY - Math.floor(k / maxItemsPerRow) * rowHeight;

        var t = addThumb({
          area: item.area,
          id: 'thumb-record' + k,
          index: k,
          itemId: item.itemId,
          year: item.year,
          title: item.title,
          docNum: item.docNum,
          don: item.don,
          tags: item.tags,
          thumbUrl: item.thumbUrl,
          imageUrl: item.imageUrl
        }, x, y, z);

        webglView.camera.lookAt(t.position);
      }
    }

    function introThumbs() {
      var len = itemsList.length;

      itemsList.forEach(function(obj, index) {
        var delay = 0.5 + (len - index) * 0.02;
        TweenMax.to(obj.material, 0.6, {
          opacity: 1,
          ease: Power1.easeOut,
          delay: delay
        });

        TweenMax.to(obj.position, 0.6, {
          x: obj.data.initialPosition.x,
          z: obj.data.initialPosition.z,
          ease: Power2.easeOut,
          delay: delay
        });
        TweenMax.to(obj.position, 0.6, {
          y: obj.data.initialPosition.y,
          ease: Back.easeOut,
          delay: delay
        });
      });
    }

    function outroThumbs() {
      var len = itemsList.length;

      itemsList.forEach(function(obj, index) {
        var delay = (len - index) * 0.02;
        TweenMax.to(obj.material, 0.6, {
          opacity: 0, ease: Power1.easeIn, delay: delay
        });
        TweenMax.to(obj.position, 0.6, {
          x: 0, ease: Power2.easeInOut, delay: delay
        });
        TweenMax.to(obj.position, 0.6, {
          y: 0, z: -camDistance * 1.8, ease: Back.easeIn, delay: delay
        });
      });
    }

    function addThumb(thumbData, x, y, z) {
      var texture = new THREE.TextureLoader().load(thumbData.thumbUrl);
      var material = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, color: '#ffffff'
      });
      var geometry = new THREE.PlaneBufferGeometry(
        config.thumbWidth,
        config.thumbHeight,
        2,
        2
      );
      var thumb = new THREE.Mesh(geometry, material);
      thumb.data = thumbData;
      thumb.data.initialPosition = {x: x, y: y, z: z};
      thumb.name = 'thumb-record';
      material.opacity = 0;
      thumb.position.x = 0;
      thumb.position.y = 0;
      thumb.position.z = -camDistance * 1.8;
      webglView.scene.add(thumb);
      itemsList.push(thumb);

      return thumb;
    }

    function selectItem(item) {
      disableInteraction();

      currentItem = item;

      changeItemsColor(0xffffff, 0x666666);

      TweenMax.to(currentItem.position, 0.6, {
        y: webglView.camera.position.y,
        x: 0,
        ease: Power1.easeOut
      });

      TweenMax.to(currentItem.position, 0.9, {
        z: camDistance * 1.25,
        ease: Power1.easeOut,
        onComplete: function() {
          currentItem.position.z = Math.round(currentItem.position.z);
          itemSelected.dispatch(currentItem);
        }
      });
    }

    function deselectItem() {
      var oldItem = currentItem;

      currentItem = null;

      changeItemsColor(0x666666, 0xffffff);

      TweenMax.to(oldItem.position, 0.4, {
        y: oldItem.data.initialPosition.y,
        z: oldItem.data.initialPosition.z,
        ease: Power1.easeOut
      });

      TweenMax.to(oldItem.position, 0.6, {
        x: oldItem.data.initialPosition.x,
        ease: Power1.easeOut,
        onComplete: function() {
          // currentItem = null;
          if (newItemToSelect) {
            selectItem(newItemToSelect);
            newItemToSelect = null;
          } else {
            enableInteraction();
          }
        }
      });
    }

    /**
     * Change the color of all items excludes the currentItem
     *
     * @param  {string} fromColor - hex color
     * @param  {string} toColor   - hex color
     */
    function changeItemsColor(fromColor, toColor) {
      var obj = {color: fromColor};

      TweenMax.to(obj, 0.5, {
        colorProps: {color: toColor},
        ease: Power1.easeInOut,
        onUpdate: function() {
          itemsList.forEach(function(element) {
            if (element !== currentItem) {
              element.material.color.set(obj.color);
            }
          });
        }
      });
    }

    function selectNextItem() {
      if (currentItem) {
        var nextIndex = currentItem.data.index + 1;
        nextIndex %= itemsList.length;
        var nextItem = itemsList[nextIndex];
        newItemToSelect = nextItem;
        newItemSelected.dispatch();
      }
    }

    function selectPreviousItem() {
      if (currentItem) {
        var prevIndex = currentItem.data.index - 1;
        if (prevIndex < 0) {
          prevIndex = itemsList.length - 1;
        }
        var prevItem = itemsList[prevIndex];
        newItemToSelect = prevItem;
        newItemSelected.dispatch();
      }
    }

    function onMouseDown(event) {
      event.preventDefault();

      mouse.x = (event.pageX / $(dom).width()) * 2 - 1;
      mouse.y = -(event.pageY / $(dom).height()) * 2 + 1;

      webglView.camera.updateMatrixWorld();
      webglView.raycaster.setFromCamera(mouse, webglView.camera);

      var intersects = webglView.raycaster.intersectObjects(itemsList);

      if (intersects.length > 0) {
        var obj = intersects[0].object;
        if (obj.name === 'thumb-record') {
          selectItem(obj);
        }
      } else {
        outro();
      }
    }

    function onMouseMove(event) {
      mouse.x = (event.pageX / $(dom).width()) * 2 - 1;
      mouse.y = -(event.pageY / $(dom).height()) * 2 + 1;
    }

    function onKeydown(event) {
      event.preventDefault();
      switch (event.keyCode) {
        case 39:
          // right
          selectNextItem();
          break;

        case 37:
          // left
          selectPreviousItem();
          break;

        default:
          //
      }
    }

    function onNextButtonClick(event) {
      event.preventDefault();
      selectNextItem();
    }

    function onPreviousButtonClick(event) {
      event.preventDefault();
      selectPreviousItem();
    }

    function enableInteraction() {
      $(dom).on('mousedown', onMouseDown);
      $(dom).on('mousemove', onMouseMove);
    }

    function disableInteraction() {
      $(dom).off('mousemove', onMouseMove);
      $(dom).off('mousedown', onMouseDown);
    }

    function enableItemsNav() {
      // dont show previous and next if there is only one item in the gallery
      if (recordList.length > 1) {
        nextButton.addEventListener('click', onNextButtonClick);
        previousButton.addEventListener('click', onPreviousButtonClick);
        TweenMax.to(nextButton, 0.3, {autoAlpha: 1, ease: Power2.easeOut});
        TweenMax.to(previousButton, 0.3, {autoAlpha: 1, ease: Power2.easeOut});
        window.addEventListener('keydown', onKeydown);
      }
    }

    function disableItemsNav() {
      if (recordList.length > 1) {
        nextButton.removeEventListener('click', onNextButtonClick);
        previousButton.removeEventListener('click', onPreviousButtonClick);
        TweenMax.to(nextButton, 0.3, {
          autoAlpha: 0, ease: Power2.easeInOut
        });
        TweenMax.to(previousButton, 0.3, {
          autoAlpha: 0, ease: Power2.easeInOut
        });
        window.removeEventListener('keydown', onKeydown);
      }
    }
  };
})(window.sl.loom, window.sl.loom.models.configModel);
