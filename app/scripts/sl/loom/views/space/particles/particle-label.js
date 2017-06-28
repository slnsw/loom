(function(classPath) {
  'use strict';

  var ParticleLabel = function() {
    this.container = document.createElement('div');
    this.container.className = 'space-label';
    this.container.style.display = 'none';
    document.body.appendChild(this.container);
  };

  ParticleLabel.prototype = {

    constructor: ParticleLabel,

    destroy: function() {
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      document.body.removeChild(this.container);
      this.container = null;
    },

    setText: function(area, count, countArea) {
      var htmlStr = '<span class="holder"><span class="label-number">';
      if (countArea && countArea > 0) {
        htmlStr += countArea + '/';
      }
      htmlStr += count + '</span>' + area + '</span>';
      this.container.innerHTML = htmlStr;
    },

    setPos: function(x, y) {
      this.container.style.top = (y - 50) + 'px';
      this.container.style.left = x + 'px';
    },

    hide: function() {
      this.container.style.display = 'none';
    },

    show: function() {
      this.container.style.display = 'block';
    }
  };

  classPath.ParticleLabel = ParticleLabel;
})(window.sl.loom.views.space);
