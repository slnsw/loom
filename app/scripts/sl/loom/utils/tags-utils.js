(function(utils) {
  'use strict';

  utils.tagToText = function(tag) {
    tag = tag.replace('_', '-');
    var aux = tag.split('-');
    var text = '';

    aux.forEach(function(element) {
      text += element.charAt(0).toUpperCase();
      text += element.substr(1, element.length);
      text += ' ';
    });

    return text;
  };
})(window.sl.loom.utils);
