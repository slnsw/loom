(function(utils) {
  'use strict';

  utils.ObjectRotateControls = function(object, domElement) {
    var mousePosition = {x: 0, y: 0};
    var scope = this;
    this.direction = -1;

    function onMouseDown(e) {
      if (scope.enabled === false) return;
      domElement.addEventListener('mousemove', onMouseMove);
      domElement.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('mouseout', onMouseUp);
      mousePosition = {x: e.clientX, y: e.clientY};
    }

    function onMouseUp() {
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseout', onMouseUp);
    }

    function onMouseMove(e) {
      if (scope.enabled === false) return;

      var diff = {
        x: (e.clientX - mousePosition.x) * 0.0025,
        y: (e.clientY - mousePosition.y) * 0.0025
      };

      scope.direction = Math.sign(diff.x);

      object.rotation.y += diff.x;
      object.rotation.x += diff.y;
      // limit rotation
      object.rotation.x = THREE.Math.clamp(object.rotation.x, 0, Math.PI / 2);
      mousePosition = {x: e.clientX, y: e.clientY};
    }

    this.destroy = function() {
      domElement.removeEventListener('mousedown', onMouseDown);
      domElement.removeEventListener('mousemove', onMouseMove);
      domElement.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseout', onMouseUp);
    };

    domElement.addEventListener('mousedown', onMouseDown);

    return this;
  };
})(window.sl.loom.utils);
