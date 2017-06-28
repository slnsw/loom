(function(app) {
  'use strict';

  // jquery-ui slider ref
  // https://jqueryui.com/slider/#default

  var SliderYear = function(minYear, maxYear, gapYear) {
    var introCompleted = new signals.Signal();
    var outroCompleted = new signals.Signal();
    var yearChanged = new signals.Signal();
    var started = new signals.Signal();
    var stopped = new signals.Signal();

    var $nav;
    var $slider;
    var $sliderArrow;
    var $sliderTooltip;
    var $svgLines;

    create();

    return {
      intro: intro,
      introCompleted: introCompleted,
      enableInteraction: enableInteraction,
      disableInteraction: disableInteraction,
      outro: outro,
      outroCompleted: outroCompleted,
      destroy: destroy,
      update: update,
      yearChanged: yearChanged,
      started: started,
      stopped: stopped
    };

    function create() {
      $nav = $('<div class="slider-year"></div>');
      $slider = $('<div class="slider"></div>');

      $nav.append($slider);

      $slider.slider({
        min: minYear,
        max: maxYear,
        value: minYear,
        range: gapYear,
        animate: true,
        slide: function(event, ui) {
          yearChanged.dispatch(ui.value);
        },
        start: function() {
          started.dispatch();
        },
        stop: function() {
          stopped.dispatch();
        }
      });
      // add tooltip
      $sliderTooltip = $('<div class="tooltip">' + minYear + '</div>');
      // add tooltip arrow / tail
      $sliderArrow = $('<div class="arrow"></div>');

      var svgStr = '<svg version="1.1" baseProfile="full" width="14" ';
      svgStr += 'height="14" xmlns="http://www.w3.org/2000/svg">';
      svgStr +=
        '<circle cx="7" cy="7" r="6" stroke="white" stroke-width="1"/>';
      svgStr += '</svg>';
      var $svg = $(svgStr);
      $svgLines = $svg.find('circle');

      var handle = $slider.find('.ui-slider-handle');
      handle.append($svg);
      handle.append($sliderTooltip);
      handle.append($sliderArrow);

      $nav.css('overflow', 'hidden');

      $('body').append($nav);
    }

    function destroy() {
      $sliderTooltip.empty();
      $sliderTooltip = null;
      $slider.slider('destroy');
      $slider.empty();
      $slider = null;
      $nav.remove();
      $nav = null;

      introCompleted.removeAll();
      introCompleted = null;
      outroCompleted.removeAll();
      yearChanged.removeAll();
      started.removeAll();
      stopped.removeAll();
    }

    function intro() {
      $slider.show();
      TweenMax.to($slider, 0.5, {
        y: 0,
        autoAlpha: 1,
        ease: Power2.easeInOut,
        overwrite: true,
        onComplete: function() {
          $nav.css('overflow', 'initial');
          enableInteraction();
        }
      });
    }

    function outro() {
      disableInteraction();
      TweenMax.to($slider, 0.3, {
        y: 120,
        autoAlpha: 0,
        ease: Power2.easeIn,
        overwrite: true,
        onComplete: function() {
          $slider.hide();
        }
      });
    }

    function update(year) {
      var color = app.utils.ColorUtils.getColorByYear(year);
      $slider.css('color', color);
      $svgLines.attr('fill', color);
      $svgLines.attr('stroke', '#444');
      $slider.slider('value', year);

      if ($sliderTooltip !== undefined) {
        $sliderTooltip.text(year);
      }
    }

    function enableInteraction() {
      if ($slider) {
        $slider.slider('enable');
      }
    }

    function disableInteraction() {
      $nav.off('mouseenter mouseleave');
      if ($slider) {
        $slider.slider('disable');
      }
    }
  };

  app.views.SliderYear = SliderYear;
})(window.sl.loom);
