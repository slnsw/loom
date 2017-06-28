(function(app) {
  'use strict';

  /*
    Animation sequence order:

    - Fade Intro Copy in a navy blue background
    - load background image
    - fade in background image
    - show progressBar white
    - show first random message
    - start loading assets
    - keep looping trough random messages untils it loads all initial assets
    - when it finishes check if its the first time of the user
    - if so show the tooltip animation
    - otherwise open the tunne view
   */
  app.views.IntroView = function() {
    var MESSAGE_TIME = 1500;
    var MIN_MESSAGES_TO_SHOW = 1; // 5;
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var controller;
    var initialAssetsService;
    var template = app.services.TemplateService.get('intro.html')();
    var $el = $(template);
    var $elTooltip;
    var $messages = $el.find('.messages p');
    var currentMessageIndex = 0;
    var curMessageIndex = -1;
    var cycleInterval;
    var $bgBar = $el.find('.bar-bg');
    var $progressBar = $el.find('.bar-progress');
    var loadCompleted = false;
    var messagesCount = 0;

    var LOADING_ARRAY = app.utils.ArrayUtils.shuffle([
      'LOADING THE PAST',
      'CALIBRATING ASSETS',
      'WEAVING STORY THREADS',
      'INDEXING PHOTOS',
      'COMPILING HISTORY',
      'Digitising moments',
      'Collecting time',
      'Plotting place',
      'Archiving inventory',
      'Distilling data'
    ]);

    var LOADING_IMAGES = [
      'images/splash/01.jpg',
      'images/splash/02.jpg',
      'images/splash/03.jpg',
      'images/splash/04.jpg',
      'images/splash/05.jpg',
      'images/splash/06.jpg',
      'images/splash/07.jpg',
      'images/splash/08.jpg',
      'images/splash/09.jpg',
      'images/splash/10.jpg'
    ];

    $(document.body).append($el);

    return {
      intro: intro,
      introCompleted: introCompleted,
      outro: outro,
      outroCompleted: outroCompleted,
      destroy: destroy,
      render: render,
      resize: resize,
      setController: setController,
      setInitialAssetsService: setInitialAssetsService
    };

    // Public Methods
    function setController(value) {
      controller = value;
    }

    function setInitialAssetsService(value) {
      initialAssetsService = value;
      initialAssetsService.allItemsLoaded.add(allItemsLoaded);
      initialAssetsService.itemLoaded.add(itemLoaded);
    }

    function intro() {
      // fade in the whole container before load the background.
      TweenMax.set($el, {autoAlpha: 0});
      TweenMax.to($el, 1.0, {
        autoAlpha: 1,
        ease: Power1.easeInOut,
        onComplete: function() {
          loadBackgroundImage();
          introCompleted.dispatch();
        }
      });
    }

    function outro() {
      TweenMax.to($el, 2.0, {
        autoAlpha: 0,
        onComplete: function() {
          $el.hide();
          outroCompleted.dispatch();
        }
      });
    }

    function destroy() {
      initialAssetsService.allItemsLoaded.remove(allItemsLoaded);
      initialAssetsService = null;
      introCompleted.dispose();
      outroCompleted.dispose();
      $el.remove();
    }

    function render() {}

    function resize() {
      $el.css({
        height: $(window).height()
      });
    }

    function allItemsLoaded() {
      loadCompleted = true;
    }

    function itemLoaded(item, loaded, total) {
      TweenMax.to($progressBar, 0.5, {
        overwrite: 'preexisting',
        scaleY: loaded / total, ease: Linear.easeInOut
      });
    }

    function finishLoading() {
      clearTimeout(cycleInterval);

      if (localStorage.visited) {
        TweenMax.fromTo($messages[curMessageIndex], 1,
          {x: '-50%', y: 0, alpha: 1},
          {y: 30, alpha: 0, ease: Power2.easeInOut}
        );

        // animate the progress bars together
        TweenMax.to($el.find('.preloader'), 0.5, {
          scaleY: 0,
          autoAlpha: 0,
          ease: Power2.easeInOut,
          delay: 0.5,
          // onComplete: controller.goToSpaceView
          onComplete: controller.goToTunnelView
        });
      } else {
        // show tooltip explanation
        localStorage.visited = true;
        goToToolTip();
      }
    }

    function goToToolTip() {
      var footer = $el.find('.footer');
      var preloader = $el.find('.preloader');

      // fade out and remove from DOM!
      TweenMax.to([footer, preloader, $messages], 0.5, {
        autoAlpha: 0,
        onComplete: function() {
          footer.remove();
          preloader.remove();
          $messages.remove();
        }});

      TweenMax.to($el.find('.bg'), 2, {
        autoAlpha: 0,
        onComplete: function() {
          initToolTip();
        }});
    }

    function initToolTip() {
      var newtemplate = app.services.TemplateService.get('tooltip.html')();
      $elTooltip = $(newtemplate);
      var mapBtn = $elTooltip.find('.map-btn');
      var mapTip = $elTooltip.find('.tip-map');
      var tunnelBtn = $elTooltip.find('.tunnel-btn');
      var tunnelTip = $elTooltip.find('.tip-tunnel');
      var spaceBtn = $elTooltip.find('.space-btn');
      var spaceTip = $elTooltip.find('.tip-space');

      $el.append($elTooltip);

      app.utils.SVGUtils.loadSvg('nav-icon-map.svg', mapBtn);
      app.utils.SVGUtils.loadSvg('nav-icon-tunnel.svg', tunnelBtn);
      app.utils.SVGUtils.loadSvg('nav-icon-space.svg', spaceBtn);

      var timeline = new TimelineLite();
      // container fades in
      timeline.to($elTooltip, 0.5, {autoAlpha: 1, delay: 1});

      // tunnel button highlight and tip
      timeline.to(tunnelBtn, 1, {css: {className: '+=highlight'}}, '+=1');
      timeline.to(tunnelTip, 2, {autoAlpha: 1, ease: Elastic.easeOut});
      timeline.to(tunnelTip, 1, {autoAlpha: 0}, '+=1');
      timeline.call(function() {
        tunnelBtn.removeClass('highlight');
      });

      // map button highlight and tip
      timeline.to(mapBtn, 1, {css: {className: '+=highlight'}});
      timeline.to(mapTip, 2, {autoAlpha: 1, ease: Bounce.easeOut});
      timeline.to(mapTip, 1, {autoAlpha: 0}, '+=1');
      timeline.call(function() {
        mapBtn.removeClass('highlight');
      });

      // space button highlight and tip
      timeline.to(spaceBtn, 1, {css: {className: '+=highlight'}});
      timeline.to(spaceTip, 2, {autoAlpha: 1, ease: Bounce.easeOut});
      timeline.to(spaceTip, 1, {autoAlpha: 0}, '+=1');
      timeline.call(function() {
        spaceBtn.removeClass('highlight');
      });

      // hide elements
      timeline.to(tunnelBtn, 0.5, {autoAlpha: 0});
      timeline.to(mapBtn, 0.5, {autoAlpha: 0});
      timeline.to(spaceBtn, 0.5, {autoAlpha: 0});

      // change view
      timeline.call(controller.goToTunnelView);
    }

    function showNextMessage() {
      if (loadCompleted && messagesCount > MIN_MESSAGES_TO_SHOW) {
        finishLoading();
        return;
      }

      var oldIndex = curMessageIndex;
      curMessageIndex++;
      curMessageIndex %= 2;

      var text = LOADING_ARRAY[currentMessageIndex].toUpperCase();
      var curEl = $messages[curMessageIndex];
      var oldEl = $messages[oldIndex];
      curEl.textContent = text;
      TweenMax.render();
      var delay = 0;

      currentMessageIndex++;
      currentMessageIndex %= LOADING_ARRAY.length;

      messagesCount++;

      if (oldIndex !== -1) {
        TweenMax.fromTo(oldEl, 1,
          {x: '-50%', y: 0, alpha: 1},
          {y: 30, alpha: 0, ease: Power2.easeInOut});
        delay = 0.5;
      }

      TweenMax.set(curEl, {x: '-50%', alpha: 0, y: -5});
      TweenMax.to(curEl, 0.5, {
        y: 0, alpha: 1, delay: delay, ease: Power1.easeOut,
        onComplete: function() {
          if (messagesCount === 1) {
            // start loading all assets after the first message is shown
            initialAssetsService.load();
          }
          // keep calling the same method
          cycleInterval = setTimeout(showNextMessage, MESSAGE_TIME);
        }
      });
    }

    function showBackground(url) {
      var bg = $el.find('.bg');
      bg.css({backgroundImage: 'url(\'' + url + '\')'});
      TweenMax.to(bg, 1, {
        alpha: 1,
        delay: 0.1,
        ease: Power1.easeInOut
      });
      TweenMax.to($bgBar, 0.5, {
        scaleY: 1,
        ease: Power2.easeInOut,
        delay: 1,
        onComplete: function() {
          showNextMessage();
        }
      });
    }

    function loadBackgroundImage() {
      var url = LOADING_IMAGES[
        Math.floor(Math.random() * LOADING_IMAGES.length)];
      var image = new Image();

      image.onload = function() {
        showBackground(url);
      };

      image.src = url;
    }
  };
})(window.sl.loom);
