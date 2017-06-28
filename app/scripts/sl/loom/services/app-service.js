(function(classPath) {
  'use strict';

  classPath.AppService = function() {
    var dataLoaded = new signals.Signal();

    function loadConfig() {
      $.getJSON('data/config.json', function(response) {
        dataLoaded.dispatch('config', response);
      });
    }

    function loadAreas() {
      $.getJSON('data/areas_coef.json', function(response) {
        var data = {};
        for (var k in response) {
          if (response.hasOwnProperty(k)) {
            data[k] = prepareAreaData(k, response[k]);
          }
        }

        dataLoaded.dispatch('areas', data);
      });
    }

    // inject docNum, thumUrl, imageUrl
    function prepareAreaData(area, data) {
      var item;
      var imagePath;

      // inject the id of the area inside its own object for quick access
      data.id = area;

      for (var docNum in data.docs) {
        if (data.docs.hasOwnProperty(docNum)) {
          item = data.docs[docNum];
          // inject the docNum into the item for easy access
          item.docNum = docNum;
          item.area = area;
          item.itemId = item.id;
          item.title = item.t;
          item.year = Number(item.y);
          imagePath = 'images/areas/' + area + '/' + item.year + '_' + docNum;
          item.thumbUrl = imagePath + '_tb.jpg';
          item.imageUrl = imagePath + '_m.jpg';

          // the json file is using only letters to reduce the file size
          // so im adding readable variables for each item
          // y = year
          // t = title
          // id = itemId
          delete item.y;
          delete item.t;
          delete item.id;
        }
      }

      return data;
    }

    return {
      loadAreas: loadAreas,
      loadConfig: loadConfig,
      dataLoaded: dataLoaded
    };
  };
})(window.sl.loom.services);
