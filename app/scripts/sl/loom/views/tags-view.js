(function(app, config) {
  'use strict';

  app.views.TagsView = function(webglView, model) {
    // signals
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();

    var $tagsNav;
    var bottomLine;
    var cameraZ;
    var controller;
    var currentItems = [];
    var currentPage = 0;
    var currentTag = '';
    var halfThumbSize = config.thumbWidth * 0.5;
    var itemsByTag;
    var itemsPerPage = 22;
    var itemsPerRow = 6;
    var itemsZ;
    var linesColor = 0x161616;
    var titleColor = '#ffffff';
    var meshCurrentTag;
    var mouse = new THREE.Vector2(0, 0);
    var nextBtn;
    var oldItems;
    var prevBtn;
    var relatedTags;
    var space = 13;
    var topLine;
    var itemView;
    var itemsDataByTag;

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

    // Public Methods
    function setController(value) {
      controller = value;
    }

    function intro() {
      var item;
      var len = webglView.itemsList.length;
      itemsByTag = [];

      currentTag = model.getTag().toLowerCase();

      itemsDataByTag = model.getItemsByTag(currentTag);

      cameraZ = webglView.camera.position.z;
      itemsZ = cameraZ - webglView.calculateCameraDistance();

      for (var i = 0; i < len; i++) {
        item = webglView.itemsList[i];
        item.visible = false;
      }

      createThumbs();
      createButtons();
      generateRelatedTags();
      createTags3d();
      createLines();
      showPage();

      TweenMax.to(webglView.camera.position, 1, {
        x: 0, y: 0, ease: Power1.easeInOut
      });
      TweenMax.to(webglView.camera.rotation, 1, {
        x: 0, y: 0, z: 0, ease: Power1.easeOut,
        onComplete: function() {
          showRelatedTags();
          enableInteraction();
          introCompleted.dispatch();
        }
      });
    }

    function outro() {
      var hasItems = currentItems.length > 0;

      disableInteraction();

      hideRelatedTags();

      if (itemView) {
        if (hasItems) {
          itemView.outroCompleted.addOnce(outroCurrentItems);
        } else {
          itemView.outroCompleted.addOnce(outroCompleted.dispatch);
        }

        itemView.outro();
      } else if (hasItems) {
        outroCurrentItems();
      } else {
        setTimeout(outroCompleted.dispatch, 500);
      }
    }

    function destroy() {
      if (itemView) {
        itemView.destroy();
      }

      itemsByTag.forEach(function(element) {
        webglView.scene.remove(element);
        element.material.dispose();
        element.geometry.dispose();
        element.data = null;
        element.userData = null;
      });

      itemsByTag.length = 0;

      $tagsNav.remove();

      introCompleted.dispose();
      outroCompleted.dispose();

      webglView.scene.remove(meshCurrentTag);
      meshCurrentTag = undefined;

      webglView.scene.remove(nextBtn);
      nextBtn = null;
      webglView.scene.remove(prevBtn);
      prevBtn = null;

      webglView.scene.remove(topLine);
      topLine = null;
      webglView.scene.remove(bottomLine);
      bottomLine = null;

      itemsDataByTag.length = 0;
      itemsDataByTag = null;

      relatedTags.length = 0;
      relatedTags = null;
    }

    function render() {
      if (itemView) {
        itemView.render();
      }
    }

    function resize() {
    }

    // Private Methods

    // Thumbs
    function createThumbs() {
      var numMeshes = itemsDataByTag.length;

      for (var i = 0; i < numMeshes; i++) {
        createThumb(itemsDataByTag[i]);
      }
    }

    function createThumb(thumbData) {
      var texture = null;
      var material = new THREE.MeshBasicMaterial({map: texture});
      var geometry = new THREE.PlaneBufferGeometry(config.thumbWidth,
        config.thumbHeight, 2, 2);
      var thumb = new THREE.Mesh(geometry, material);
      thumb.data = thumbData;
      thumb.userData.loaded = false;
      thumb.name = 'thumb';
      thumb.position.x = 0;
      thumb.position.z = itemsZ;
      thumb.position.y = 0;
      thumb.visible = false;
      webglView.scene.add(thumb);
      itemsByTag.push(thumb);
      return thumb;
    }

    function outroCurrentItems() {
      if (currentItems.length > 0) {
        transitionPageOut(currentItems, 'left', function() {
          outroCompleted.dispatch();
        });
      }
    }

    /**
     * Create next and previous square buttons.
     *
     */
    function createButtons() {
      var texture = new THREE.TextureLoader().load(
        'images/ui/pagination-next-btn.jpg');
      var material = new THREE.MeshBasicMaterial({map: texture});
      var geom = new THREE.PlaneBufferGeometry(
        config.thumbWidth, config.thumbHeight, 2, 2);
      nextBtn = new THREE.Mesh(geom, material);
      nextBtn.name = 'nextBtn';
      nextBtn.visible = false;
      webglView.scene.add(nextBtn);

      texture = new THREE.TextureLoader().load(
        'images/ui/pagination-previous-btn.jpg');
      material = new THREE.MeshBasicMaterial({map: texture});
      geom = new THREE.PlaneBufferGeometry(
        config.thumbWidth, config.thumbHeight, 2, 2);
      prevBtn = new THREE.Mesh(geom, material);
      prevBtn.name = 'prevBtn';
      prevBtn.visible = false;
      webglView.scene.add(prevBtn);
    }

    function createLines() {
      topLine = createLine();
      bottomLine = createLine();
    }

    function createLine() {
      var material = new THREE.LineBasicMaterial({
        color: linesColor,
        linewidth: 1
      });
      var geometry = new THREE.Geometry();
      var line;
      var vec = new THREE.Vector3(0, 0, 0);
      vec.x = (itemsPerRow * config.thumbWidth) + (itemsPerRow - 1) * space;
      geometry.vertices.push(new THREE.Vector3(0, 0, 0));
      geometry.vertices.push(vec);

      line = new THREE.Line(geometry, material);
      webglView.scene.add(line);

      return line;
    }

    // //////////////////////////////////////////////////////////////////////////
    // Pagination
    // //////////////////////////////////////////////////////////////////////////

    function showPage(direction) {
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

      currentItems = itemsByTag.slice(startIndex, endIndex);

      if (currentPage > 0) {
        currentItems.splice(0, 0, prevBtn);
      }

      if (currentPage >= 0) {
        if (itemsByTag.length > endIndex + 1) {
          currentItems.push(nextBtn);
        } else if (itemsByTag.length === endIndex + 1) {
          // add the last thumb instead of the next thumb.
          currentItems.push(itemsByTag[itemsByTag.length - 1]);
        }
        // if (itemsByTag.length > endIndex) {
        //   currentItems.push(nextBtn);
        // }
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

        TweenMax.to(item.position, 0.7, props);
        TweenMax.to(item.scale, 0.6, {x: 0.001, y: 0.001, delay: props.delay});
      });
    }

    function transitionPageIn(array, direction, resetPosition) {
      var dir = direction === 'left' ? -1 : 1;
      var len = array.length;
      var rows = Math.ceil(len / itemsPerRow);
      var h = rows * config.thumbWidth + (space * (rows - 1));
      var dif_ = itemsPerRow * config.thumbWidth + (space * (itemsPerRow - 1));
      var dif = -dif_ * 0.5 + halfThumbSize;
      var difY = h / 2 - halfThumbSize;

      TweenMax.to(meshCurrentTag.material, 1, {
        opacity: 1,
        ease: Power1.easeOut
      });
      TweenMax.to(meshCurrentTag.position, 1, {
        x: dif + 256 - halfThumbSize,
        y: difY + 32 + halfThumbSize,
        ease: Power1.easeOut
      });

      // rearrange lines
      TweenMax.to(topLine.position, 1, {
        x: dif - halfThumbSize,
        y: difY + halfThumbSize + 16,
        z: itemsZ, ease: Power1.easeInOut
      });
      TweenMax.to(bottomLine.position, 1, {
        x: dif - halfThumbSize,
        y: -difY - halfThumbSize - 16,
        z: itemsZ, ease: Power1.easeInOut
      });

      array.forEach(function(item, i) {
        var col = i % itemsPerRow * (config.thumbWidth + space);
        var row = Math.floor(i / itemsPerRow) * (config.thumbHeight + space);
        var x = dif + col;
        var y = difY - row;
        var z1 = item.position.z;
        var delay = i * 0.01;

        if (!item.userData.loaded && item.name === 'thumb') {
          // load image for the first time if its not loaded
          item.userData.loaded = true;
          item.material.map = new THREE.TextureLoader()
            .load(item.data.thumbUrl);
          item.material.needsUpdate = true;
        }

        if (resetPosition) {
          item.position.z = z1;
          item.position.x = x - (dir * 2000);
          item.position.y = y;
        } else {
          TweenMax.to(item.position, 1, {
            y: y, delay: delay, ease: Power1.easeInOut
          });
        }

        TweenMax.to(item.position, 1, {
          x: x, delay: delay, ease: Power1.easeOut
        });
        TweenMax.to(item.position, 1, {
          z: itemsZ, delay: delay, ease: Power1.easeOut
        });
        TweenMax.to(item.scale, 0.6, {x: 1.0, y: 1.0, delay: delay});
        item.visible = true;
      });
    }

    function nextPage() {
      var offset = (currentPage + 1) * itemsPerPage + 1;
      if (offset <= itemsByTag.length) {
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
    // Related Tags
    // //////////////////////////////////////////////////////////////////////////

    function createTag(text, fontSize, width, height, x, y, z) {
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
        fillStyle: titleColor,
        align: 'left',
        margin: 0,
        font: font
      });

      var geometry = new THREE.PlaneBufferGeometry(width, height, 4, 4);
      var tag = new THREE.Mesh(geometry, material);
      tag.position.x = x;
      tag.position.y = y;
      tag.position.z = z;
      tag.data = {text: text};
      return tag;
    }

    function createTags3d() {
      // header
      var tagCounterStr = '(' + itemsDataByTag.length + ')';
      var tagStr = app.utils.tagToText(currentTag);
      meshCurrentTag = createTag(tagStr + tagCounterStr,
        '24px', 512, 64, 0, 0, itemsZ);
      meshCurrentTag.material.opacity = 0;
      webglView.scene.add(meshCurrentTag);

      var tagText;
      var $ul = $('<ul></ul>');
      for (var i = 0; i < relatedTags.length; i++) {
        tagText = relatedTags[i].tag;
        $ul.append('<li class="tag">' + tagText + '</li>');
      }

      var str = '<div class="tag-nav fixed-bottom"><h5>Related tags</h5></div>';
      $tagsNav = $(str);
      $tagsNav.append($ul);
      $tagsNav.hide();
      $('body').append($tagsNav);
    }

    function showRelatedTags() {
      $tagsNav.fadeIn(400);
    }

    function hideRelatedTags() {
      $tagsNav.fadeOut(400);
    }

    function generateRelatedTags() {
      var item;
      var list = [];
      var tagDict = {};
      var thumbTags;

      // create a counter for each tag
      for (var i = 0; i < itemsByTag.length; i++) {
        item = itemsByTag[i];
        thumbTags = item.data.tags;

        for (var t = 0; t < thumbTags.length; t++) {
          if (tagDict[thumbTags[t]] === undefined) {
            tagDict[thumbTags[t]] = 1;
          } else {
            tagDict[thumbTags[t]]++;
          }
        }
      }

      // remove the currentTag from the dict
      if (tagDict[currentTag] !== undefined) {
        delete tagDict[currentTag];
      }

      // populate the list so we can sort by count
      for (var key in tagDict) {
        if (tagDict.hasOwnProperty(key)) {
          list.push({tag: key, count: tagDict[key]});
        }
      }

      list.sort(function(a, b) {
        if (a.count < b.count) {
          return -1;
        }
        if (a.count > b.count) {
          return 1;
        }

        return 0;
      });

      // get the top 10
      if (list.length > 10) {
        list = list.slice(list.length - 11, list.length - 1);
      }
      relatedTags = list;
    }

    // Mouse Handlers

    function onMouseDown(event) {
      event.preventDefault();
      mouse.x = (event.clientX / webglView.$dom.width()) * 2 - 1;
      mouse.y = -(event.clientY / webglView.$dom.height()) * 2 + 1;
      webglView.camera.updateMatrixWorld();
      webglView.raycaster.setFromCamera(mouse, webglView.camera);

      var intersects = webglView.raycaster.intersectObjects(
        webglView.scene.children);

      if (intersects.length > 0) {
        var obj;

        for (var m = 0; m < intersects.length; m++) {
          obj = intersects[m].object;
          if (obj.visible && obj.name === 'tag') {
            controller.goToTagsView(obj.data.text);
            return;
          }
          if (obj.visible && obj.name === 'thumb') {
            if (model.getState() === 'Tags') {
              // openItem(obj);
              openItemView(obj);
            }

            return;
          }

          if (obj.name === 'nextBtn') {
            nextPage();
          }

          if (obj.name === 'prevBtn') {
            previousPage();
          }
        }
      } else if (model.getState() === 'Tags') {
        var state = model.getPreviousState() || 'Tunnel';

        if (state === 'Tags') {
          state = 'Tunnel';
        }
        model.setState(state);
        disableInteraction();
      }
    }

    function tagsNavClick(e) {
      var tagName = e.target.innerHTML;
      e.preventDefault();
      controller.goToTagsView(tagName);
    }

    function enableInteraction() {
      webglView.$dom.on('mousedown', onMouseDown);
      $tagsNav.find('li').on('click', tagsNavClick);
    }

    function disableInteraction() {
      webglView.$dom.off('mousedown', onMouseDown);
      $tagsNav.find('li').off('click', tagsNavClick);
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
      hideRelatedTags();
    }

    function itemViewTagClicked(tag) {
      controller.goToTagsView(tag);
    }

    function itemViewBackgroundClick() {
      itemView.outroCompleted.addOnce(function() {
        var selectedItem = itemView.getSelectedItem();
        TweenMax.to(selectedItem.position, 0.7, {
          z: itemsZ,
          ease: Power2.easeInOut
        });
        TweenMax.to(webglView.camera.position, 0.7, {
          z: cameraZ,
          x: 0,
          y: 0,
          ease: Power2.easeInOut
        });
        itemView.destroy();
        itemView = undefined;
        enableInteraction();
        showRelatedTags();
      });

      itemView.outro();
    }

    function itemViewBackgroundThumbClick(thumb) {
      itemView.outroCompleted.addOnce(function() {
        var selectedItem = itemView.getSelectedItem();
        // move item back
        TweenMax.to(selectedItem.position, 0.7, {
          z: itemsZ,
          ease: Power2.easeInOut
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
  };
})(window.sl.loom, window.sl.loom.models.configModel);
