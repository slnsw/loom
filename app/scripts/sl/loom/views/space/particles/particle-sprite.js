(function(app) {
  'use strict';

  var radius = 1000;
  var pi2 = Math.PI * 2;
  var noiseY = 50;
  var offsetY = -500;
  var r;
  var bubbleTexture;
  var hoverSound;
  var MIN_SCALE = 6;

  // Module to create, update, load/unload assets for Particles as
  // THREE Sprite Object
  app.views.space.particles.ParticleSprite = {

    prepareAssets: function() {
      bubbleTexture = new THREE.TextureLoader().load(
        'images/space/particle.png');
      hoverSound = new Howl({
        src: ['audios/beep-03.mp3']
      });
    },

    destroyAssets: function() {
      bubbleTexture.dispose();
      bubbleTexture = null;
      hoverSound.unload();
      hoverSound = null;
    },

    /**
     * Create a particle with a topic data in a random position
     * Used in ParticlesView
     *
     * @param  {String} uniqueTopicKey   - Unique Topic Key
     * @param {Object} topicObj - ex:
     * {
     *   all:Int16Array[26]
     *   circular_quay: Int16Array[26]
     *   ... (all other areas could be listed here)
     *   key: "stone houses"
     *   total: 1
     * }
     * @return {Object}       - THREE.Sprite object with texture and color
     */
    createTopicRandomPos: function(uniqueTopicKey, topicObj) {
      var o = this.createBasic();
      var angle = Math.random() * pi2;
      r = (radius * Math.random());
      angle = Math.random() * pi2;
      o.position.x = Math.sin(angle) * r * 2; // x
      o.position.z = Math.cos(angle) * r; // z
      o.position.y = Math.sqrt(topicObj.total) * 25 + Math.random() * 200 +
        50; // y
      o.position.round();
      o.userData.obj = topicObj;
      o.userData.key = uniqueTopicKey;
      o.userData.title = uniqueTopicKey + ' / ' + topicObj.total;
      o.userData.initX = o.position.x;
      o.userData.initZ = o.position.z;
      o.userData.initY = o.position.y;
      o.userData.currentCount = -1;
      o.userData.scale = 1;
      o.visible = false;
      return o;
    },

    /**
     * Create a basic particle with the particle texture.
     *
     * @param  {Object} color - THREE.Color object and can be undefined
     * @return {Object}       - THREE.Sprite object with texture and color
     */
    createBasic: function(color) {
      var params = {
        map: bubbleTexture
      };
      if (color instanceof THREE.Color) {
        params.color = color;
      }
      var m = new THREE.SpriteMaterial(params);
      return new THREE.Sprite(m);
    },

    calculateInitY: function(sprite) {
      var data = sprite.userData;
      data.initY = offsetY + Math.sqrt(data.count * 3) * 60 + 100 +
          (Math.random() * noiseY);
    },

    update: function(sprite, newCount) {
      if (newCount === sprite.userData.currentCount) {
        // dont need to recalculate count new:
        return;
      }
      // calculate new scale based on count
      var scale = newCount * 2 + MIN_SCALE;
      // scale = 100;
      sprite.userData.initY = offsetY + Math.sqrt(newCount * 3) * 60 + 100 +
        (Math.random() * noiseY);

      if (newCount < 2) {
        sprite.userData.initY = offsetY;
      }

      sprite.visible = true;
      sprite.userData.initY = Math.floor(sprite.userData.initY);

      if (sprite.userData.currentCount > 2 || newCount > 2) {
        // USE TWEEN
        TweenMax.to(sprite.position, 0.4, {
          x: sprite.userData.initX,
          y: sprite.userData.initY,
          z: sprite.userData.initZ,
          ease: Power2.easeOut,
          delay: 0.1
        });

        TweenMax.to(sprite.scale, 0.4, {
          x: scale,
          y: scale,
          ease: Power2.easeOut,
          delay: 0.1
        });
      } else {
        // static, its too small so we dont need to waste processing to animate
        sprite.position.x = sprite.userData.initX;
        sprite.position.y = sprite.userData.initY;
        sprite.position.z = sprite.userData.initZ;
        sprite.scale.x = scale;
        sprite.scale.y = scale;
      }

      // update variables
      sprite.userData.currentCount = newCount;
      sprite.userData.initScale = scale;
    },

    hide: function(sprite, delay) {
      TweenMax.to(sprite.position, 0.4, {
        y: 0,
        ease: Back.easeIn,
        delay: delay
      });

      TweenMax.to(sprite.scale, 0.4, {
        x: 1,
        y: 1,
        ease: Back.easeIn,
        delay: delay,
        onComplete: function() {
          sprite.scale.set(1, 1, 1);
          sprite.visible = false;
        }
      });
    },

    show: function(sprite, delay) {
      TweenMax.to(sprite.position, 0.4, {
        y: sprite.userData.initY,
        ease: Back.easeOut,
        delay: delay
      });
      var s = sprite.userData.currentCount * 2 + MIN_SCALE;
      TweenMax.to(sprite.scale, 0.4, {
        x: s,
        y: s,
        ease: Back.easeOut,
        delay: delay,
        onComplete: function() {
          sprite.scale.set(s, s, 0);
        }
      });
      sprite.visible = true;
    },

    hoverOn: function(sprite, yearColor) {
      var offsetHsl = (sprite.userData.currentCount) / 400;
      sprite.material.color.copy(yearColor);
      sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
      sprite.material.needsUpdate = true;
      hoverSound.volume(Math.min(1, sprite.userData.currentCount / 300) + 0.2);
      hoverSound.play();
      var scale = sprite.userData.initScale * 1.25;
      TweenMax.to(sprite.scale, 0.3, {
        x: scale,
        y: scale,
        ease: Back.easeOut
      });
    },

    hoverOff: function(sprite, yearColor) {
      var offsetHsl = (sprite.userData.currentCount - 100) / 400;
      sprite.material.color.copy(yearColor);
      sprite.material.color.offsetHSL(0.0, 0.0, offsetHsl);
      sprite.material.needsUpdate = true;
      var scale = sprite.userData.initScale;
      TweenMax.to(sprite.scale, 0.25, {
        x: scale,
        y: scale,
        ease: Power2.easeInOut
      });
    },

    tweenRemoveHSLOffset: function(sprite, colorObj) {
      var offset = {
        l: (sprite.userData.currentCount - 100) / 400
      };

      var updateColor = function() {
        sprite.material.color.copy(colorObj);
        sprite.material.color.offsetHSL(0.0, 0.0, offset.l);
        sprite.material.needsUpdate = true;
      };

      TweenMax.to(offset, 0.5, {
        l: 0,
        ease: Power2.easeInOut,
        onUpdate: updateColor,
        onComplete: updateColor
      });
    }

  };
})(window.sl.loom);
