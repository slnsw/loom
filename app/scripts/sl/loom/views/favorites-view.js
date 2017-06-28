(function(app, config) {
  'use strict';

  app.views.FavoritesView = View;

  function View(webglView, model) {
    var controller;
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var itemsDictByDocNum = {};
    var meshCurrentTag;
    var favoritesService = new app.services.FavoritesService();
    var msgObj;
    var msgImageUrl = 'images/ui/favorites-empty-msg.png';
    var oldItems;
    var currentItems = [];
    var favItemsList;
    var cameraZ;
    var mouse = new THREE.Vector3(0, 0, 0.5);

    var itemView;

    // pagination
    var currentPage = 0;
    var itemsPerPage = 22;
    var nextBtn;
    var prevBtn;
    var itemsZ;

    var space = 13;
    var itemsPerRow = 6;
    var halfThumbSize = config.thumbWidth * 0.5;

    return {
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      destroy: destroy,
      render: render,
      resize: resize,
      setController: setController
    };

    function setController(value) {
      controller = value;
    }

    function intro() {
      cameraZ = 0;
      var time = Math.abs(cameraZ - webglView.camera.position.z) * 0.0001;
      time = time.toFixed(1);
      time = Math.max(0.7, time);

      itemsZ = cameraZ - webglView.calculateCameraDistance();

      organizeItems();

      if (favItemsList.length > 0) {
        createButtons();
        createTitle();
      } else {
        createMessage();
      }

      TweenMax.to(webglView.camera.position, time, {
        x: 0,
        y: 0,
        z: cameraZ,
        ease: Power1.easeInOut
      });

      TweenMax.to(webglView.camera.rotation, time, {
        x: 0,
        y: 0,
        z: 0,
        ease: Power1.easeOut,
        onComplete: function() {
          if (favItemsList.length > 0) {
            showPage();
          }
          enableInteraction();
          introCompleted.dispatch();
        }});
    }

    function outro() {
      disableInteraction();

      if (favItemsList.length > 0) {
        // hide pagination
        if (itemView) {
          // finish t
          itemView.outroCompleted.addOnce(outroVisibleItems);
          itemView.outro();
        } else {
          outroVisibleItems();
        }
      } else {
        // hide only the message
        hideMessage();
      }
    }

    function outroVisibleItems() {
      var time = 0;

      if (nextBtn && nextBtn.visible) {
        TweenMax.to(nextBtn.position, 0.4, {
          z: THREE.Math.randInt(-15000, -20000),
          ease: Power2.easeInOut,
          delay: time
        });
        time += 0.025;
      }

      if (prevBtn && prevBtn.visible) {
        TweenMax.to(prevBtn.position, 0.4, {
          z: THREE.Math.randInt(-15000, -20000),
          ease: Power2.easeInOut,
          delay: time
        });
        time += 0.025;
      }

      TweenMax.to(meshCurrentTag.position, 0.4, {
        z: THREE.Math.randInt(-15000, -20000),
        ease: Power2.easeInOut,
        delay: time
      });
      time += 0.025;

      currentItems.forEach(function(item) {
        TweenMax.to(item.position, 0.4, {
          z: THREE.Math.randInt(-15000, -20000),
          ease: Power2.easeInOut,
          delay: time
        });
        time += 0.025;
      });

      setTimeout(outroCompleted.dispatch, time * 1000 + 600);
    }

    function destroy() {
      if (itemView) {
        itemView.destroy();
      }

      if (favItemsList.length > 0) {
        webglView.scene.remove(nextBtn);
        nextBtn = null;
        webglView.scene.remove(prevBtn);
        prevBtn = null;
        webglView.scene.remove(meshCurrentTag);
        meshCurrentTag = undefined;

        favItemsList.forEach(function(mesh) {
          webglView.scene.remove(mesh);
          mesh.geometry.dispose();
          mesh.material.dispose();
        });
      } else {
        if (msgObj) {
          webglView.scene.remove(msgObj);
          msgObj = null;
        }
      }

      itemsDictByDocNum = {};
      favItemsList.length = 0;
    }

    function render() {
      if (itemView) {
        itemView.render();
      }
    }

    function resize() {
      if (msgObj) {
        var camDistance = webglView.calculateCameraDistance();
        msgObj.position.z = webglView.camera.position.z - camDistance;
      }
    }

    function createTitle() {
      var width = 512;
      var height = 64;
      var text = 'Favourites';
      var fontSize = '28px';
      var dynamicTexture = new THREEx.DynamicTexture(width, height);
      var material = new THREE.MeshBasicMaterial({
        map: dynamicTexture.texture
      });

      material.transparent = true;
      dynamicTexture.clear('rgba(255, 255, 255, 0.0)');
      var font = '100 ' + fontSize + ' Roboto';

      dynamicTexture.drawTextCooked({
        text: text,
        lineHeight: 0.5,
        fillStyle: '#ffffff',
        align: 'left',
        margin: 0,
        font: font
      });

      var geometry = new THREE.PlaneBufferGeometry(width, height, 4, 4);
      meshCurrentTag = new THREE.Mesh(geometry, material);
      meshCurrentTag.position.x = 0;
      meshCurrentTag.position.y = webglView.camera.position.y;
      meshCurrentTag.position.z = itemsZ;
      meshCurrentTag.material.opacity = 0;
      webglView.scene.add(meshCurrentTag);
    }

    function createButtons() {
      var tbh = config.thumbHeight;
      var tbw = config.thumbWidth;
      var nextImgUrl = 'images/ui/pagination-next-btn.jpg';
      var prevImgUrl = 'images/ui/pagination-previous-btn.jpg';
      var texture = new THREE.TextureLoader().load(nextImgUrl);
      var material = new THREE.MeshBasicMaterial({map: texture});
      var geom = new THREE.PlaneBufferGeometry(tbw, tbh, 2, 2);
      nextBtn = new THREE.Mesh(geom, material);
      nextBtn.name = 'nextBtn';
      nextBtn.visible = false;
      webglView.scene.add(nextBtn);

      texture = new THREE.TextureLoader().load(prevImgUrl);
      material = new THREE.MeshBasicMaterial({map: texture});
      geom = new THREE.PlaneBufferGeometry(tbw, tbh, 2, 2);
      prevBtn = new THREE.Mesh(geom, material);
      prevBtn.name = 'prevBtn';
      prevBtn.visible = false;
      webglView.scene.add(prevBtn);
    }

    function organizeItems() {
      var list = favoritesService.getList();
      var data = model.getData();
      var i;
      var len = list.length;
      favItemsList = [];

      if (len === 0) {
        return;
      }

      // check if the item docNum exists in the areas.
      for (var key in data) {
        if (data.hasOwnProperty(key)) {
          for (i = 0; i < len; i++) {
            if (data[key].docs[list[i]]) {
              addThumb(data[key].docs[list[i]]);
            }
          }
        }
      }
    }

    function addThumb(thumbData) {
      var texture = null;
      var material = new THREE.MeshBasicMaterial({map: texture});
      var geometry = new THREE.PlaneBufferGeometry(config.thumbWidth,
        config.thumbHeight, 2, 2);
      var thumb = new THREE.Mesh(geometry, material);
      thumb.data = thumbData;
      thumb.userData.loaded = false;
      thumb.name = 'thumb-fav';
      thumb.position.x = 0;
      thumb.position.z = -10000;
      thumb.position.y = 0;
      thumb.visible = false;
      webglView.scene.add(thumb);

      favItemsList.push(thumb);
    }

    function createMessage() {
      new THREE.TextureLoader().load(msgImageUrl, onMessageTextureLoad);
    }

    function showMessage() {
      TweenMax.to(msgObj.position, 1.0, {
        y: 0, z: itemsZ, ease: Power1.easeInOut, delay: 0.2});
      TweenMax.to(msgObj.material, 1.0, {
        opacity: 1.0, ease: Power1.easeInOut, delay: 0.2});
    }

    function hideMessage() {
      TweenMax.to(msgObj.position, 0.7, {
        y: 0,
        z: itemsZ - 2000,
        ease: Power1.easeInOut
      });

      TweenMax.to(msgObj.material, 0.7, {
        opacity: 0.0,
        ease: Power1.easeInOut,
        onComplete: function() {
          outroCompleted.dispatch();
        }
      });
    }

    function onMessageTextureLoad(texture) {
      texture.minFilter = THREE.LinearFilter;
      var cam = webglView.camera;
      var favBtnMaterial = new THREE.MeshBasicMaterial({
        map: texture, transparent: true, opacity: 1.0});
      var favBtnGeom = new THREE.PlaneBufferGeometry(256, 256, 5, 5);
      msgObj = new THREE.Mesh(favBtnGeom, favBtnMaterial);
      msgObj.name = 'msg';
      msgObj.position.x = 0;
      msgObj.position.y = cam.position.y;
      msgObj.position.z = itemsZ - 2000;
      favBtnMaterial.opacity = 0.0;
      webglView.scene.add(msgObj);
      showMessage();
    }

    function enableInteraction() {
      webglView.$dom.on('mousedown', onMouseDown);
    }

    function disableInteraction() {
      webglView.$dom.off('mousedown', onMouseDown);
    }

    function onMouseDown(event) {
      event.preventDefault();
      mouse.x = (event.clientX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.clientY / webglView.$dom.height()) * 2 + 1;

      webglView.camera.updateMatrixWorld();
      webglView.raycaster.setFromCamera(mouse, webglView.camera);

      var intersects = webglView.raycaster.intersectObjects(currentItems);

      if (intersects.length > 0) {
        var obj;

        for (var m = 0; m < intersects.length; m++) {
          obj = intersects[m].object;

          if (obj.visible && obj.name === 'thumb-fav') {
            openItemView(obj);
            return;
          }

          if (obj.name === 'nextBtn') {
            nextPage();
            return;
          }

          if (obj.name === 'prevBtn') {
            previousPage();
            return;
          }
        }
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // Pagination
    // //////////////////////////////////////////////////////////////////////////

    function showPage(direction) {
      console.log('showPage', direction);
      oldItems = currentItems;
      // page 1 = 23 thumbs + 1 next button as thumb
      // page 2... N -1 = 22 thumbs + next and previous button as thumb
      var perPage = itemsPerPage;
      var startIndex = 0;

      if (currentPage === 0) {
        // the first page doesnt have previous button so it will have 23 items
        perPage = itemsPerPage + 1;
        startIndex = 0;
      } else {
        startIndex = 23;
        startIndex += (currentPage - 1) * 22;
      }

      var endIndex = startIndex + perPage;

      currentItems = favItemsList.slice(startIndex, endIndex);

      if (currentPage > 0) {
        currentItems.splice(0, 0, prevBtn);
      }

      if (currentPage >= 0) {
        if (favItemsList.length > endIndex + 1) {
          currentItems.push(nextBtn);
        } else if (favItemsList.length === endIndex + 1) {
          // add the last thumb instead of the next thumb.
          currentItems.push(favItemsList[favItemsList.length - 1]);
        }
      }

      if (oldItems.length > 0) {
        transitionPageOut(oldItems, direction, function() {
          transitionPageIn(currentItems, direction, true);
        });
      } else {
        transitionPageIn(currentItems, direction, false);
      }
    }

    function transitionPageOut(array, direction, callback) {
      var dir = direction === 'left' ? -1 : 1;
      array.forEach(function(item, i, array) {
        var props = {
          x: item.position.x + (dir * 2000),
          delay: i * 0.005,
          ease: Power1.easeInOut
        };
        if (i === array.length - 1) {
          props.onComplete = callback;
        }
        TweenMax.to(item.position, 0.5, props);
        TweenMax.to(item.scale, 0.5, {
          x: 0.001, y: 0.001, ease: Power1.easeIn, delay: props.delay
        });
      });
    }

    function transitionPageIn(array, direction, resetPosition) {
      var dir = direction === 'left' ? -1 : 1;
      var len = array.length;
      var dif_ = itemsPerRow * config.thumbWidth + (space * (itemsPerRow - 1)); // auxiliar var
      var dif = -dif_ * 0.5 + halfThumbSize;
      var difY_ = Math.ceil(len / itemsPerRow); // auxiliar var
      var difY = difY_ * config.thumbHeight * 0.5 - halfThumbSize;

      TweenMax.to(meshCurrentTag.material, 0.5, {
        opacity: 1, ease: Power1.easeOut
      });
      TweenMax.to(meshCurrentTag.position, 0.5, {
        x: dif + 256 - halfThumbSize,
        y: difY + 32 + halfThumbSize,
        ease: Power1.easeOut
      });

      array.forEach(function(item, i) {
        var col = i % itemsPerRow * (config.thumbWidth + space);
        var row = Math.floor(i / itemsPerRow) * (config.thumbHeight + space);
        var x = dif + col;
        var y = difY - row;
        var z1 = item.position.z;

        if (!item.userData.loaded && item.name === 'thumb-fav') {
          // load image for the first time if its not loaded
          item.userData.loaded = true;
          // item.material.map = THREE.ImageUtils.loadTexture(item.data.thumbUrl);
          item.material.map = new THREE.TextureLoader()
            .load(item.data.thumbUrl);
          item.material.needsUpdate = true;
        }

        if (resetPosition) {
          item.position.z = z1;
          item.position.x = x - (dir * 2000);
          item.position.y = y;
        } else {
          TweenMax.to(item.position, 0.7, {
            y: y, delay: delay, ease: Power1.easeInOut
          });
        }

        var delay = i * 0.01;

        TweenMax.to(item.position, 0.7, {
          x: x, delay: delay, ease: Power1.easeOut
        });
        TweenMax.to(item.position, 0.7, {
          z: itemsZ, delay: delay, ease: Power1.easeOut
        });
        TweenMax.to(item.scale, 0.6, {
          x: 1.0, y: 1.0, delay: delay
        });
        item.visible = true;
      });
    }

    function nextPage() {
      var offset = (currentPage + 1) * itemsPerPage + 1;
      if (offset <= favItemsList.length) {
        currentPage++;
        showPage('left');
      }
    }

    function previousPage() {
      var offset = (currentPage - 1) * itemsPerPage + 1;
      if (offset > 0) {
        currentPage--;
        showPage('right');
      }
    }

    // //////////////////////////////////////////////////////////////////////////
    // ItemView
    // //////////////////////////////////////////////////////////////////////////

    function openItemView(selectedItem) {
      // dont use related
      itemView = new app.views.ItemView(webglView, selectedItem);

      itemView.tagClicked.addOnce(itemViewTagClicked);
      itemView.backgroundClicked.addOnce(itemViewBackgroundClick);
      itemView.backgroundThumbClicked.addOnce(itemViewBackgroundThumbClick);
      itemView.introCompleted.add(itemViewIntroCompleted);

      var difZ = 1000;

      // move camera to the imageObj position
      TweenMax.to(webglView.camera.position, 0.7, {
        z: cameraZ + difZ,
        x: selectedItem.position.x,
        y: selectedItem.position.y,
        ease: Power2.easeInOut
      });
      TweenMax.to(selectedItem.position, 0.7, {
        z: itemsZ + difZ,
        ease: Power2.easeInOut,
        onComplete: function() {
          itemView.intro();
        }
      });

      disableInteraction();
    }

    function itemViewTagClicked(tag) {
      controller.goToTagsView(tag);
    }

    function itemViewBackgroundClick() {
      itemView.outroCompleted.addOnce(function() {
        var selectedItem = itemView.getSelectedItem();
        TweenMax.to(selectedItem.position, 0.7, {
          z: itemsZ, ease: Power2.easeInOut
        });
        TweenMax.to(webglView.camera.position, 0.7, {
          z: cameraZ, x: 0, y: 0, ease: Power2.easeInOut
        });
        itemView.destroy();
        itemView = undefined;
        enableInteraction();
      });

      itemView.outro();
    }

    function itemViewBackgroundThumbClick(thumb) {
      itemView.outroCompleted.addOnce(function() {
        var selectedItem = itemView.getSelectedItem();
        // move item back
        TweenMax.to(selectedItem.position, 0.7, {
          z: itemsZ, ease: Power2.easeInOut
        });
        // destroy currentItem
        itemView.destroy();
        itemView = undefined;

        // open new thumb
        openItemView(thumb);
      });
      //  send item to to the grid
      itemView.outro();
    }

    function itemViewIntroCompleted() {
      // moveItemsAwayFromSelected();
    }
  }
}(window.sl.loom, window.sl.loom.models.configModel));
