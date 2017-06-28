(function(app, configModel) {
  'use strict';

  app.models.AppModel = Model;

  function Model() {
    var dataChanged = new signals.Signal();
    var stateChanged = new signals.Signal();
    var tagChanged = new signals.Signal();
    var yearChanged = new signals.Signal();

    var data;
    var previousState;
    var selectedItem;
    var state;
    var tag = '';
    var tagsDict = {};
    var itemsByYearGap = [];
    var year = 1870;
    var tunnelItemsData = [];

    return {
      getTunnelItemsData: getTunnelItemsData,

      getData: getData,
      setData: setData,
      dataChanged: dataChanged,

      getPreviousState: getPreviousState,
      getState: getState,
      setState: setState,
      stateChanged: stateChanged,

      getTag: getTag,
      setTag: setTag,
      tagChanged: tagChanged,

      getYear: getYear,
      setYear: setYear,
      getYearIndex: getYearIndex,
      getYearByIndex: getYearByIndex,
      yearChanged: yearChanged,

      setSelectedItem: setSelectedItem,
      getSelectedItem: getSelectedItem,
      getItemsByTag: getItemsByTag,
      getItemsByYearGap: getItemsByYearGap,

      getItemsByAreaAndYearGap: getItemsByAreaAndYearGap,
      getItemsByTopicAndYearGap: getItemsByTopicAndYearGap
    };

    function getData() {
      return data;
    }

    function setData(value) {
      data = value;
      createItemsByYearGap();
      createTagRelations();
      createTunnelItemsData();
      dataChanged.dispatch(data);
    }

    function getPreviousState() {
      return previousState;
    }

    function getState() {
      return state;
    }

    function setState(value) {
      // tag state can replace the current tag state.
      if (value !== state || value === 'Tags') {
        previousState = state;
        state = value;
        stateChanged.dispatch(state);
      }
    }

    function getYear() {
      return year;
    }

    function setYear(value) {
      value = Math.min(configModel.endYear,
        Math.max(configModel.startYear, value));

      if (value !== year) {
        year = value;
        yearChanged.dispatch(year);
      }
    }

    function getYearIndex(year) {
      var maxGaps = Math.floor((configModel.endYear - configModel.startYear) /
        configModel.gapYear) - 1;
      var y = Math.floor((year - configModel.startYear) / configModel.gapYear);
      return Math.min(maxGaps, Math.max(0, y));
    }

    function getYearByIndex(index) {
      var year = configModel.startYear + (index * configModel.gapYear);
      return Math.min(configModel.endYear, year);
    }

    function getTag() {
      return tag;
    }

    function setTag(value) {
      if (tag !== value) {
        tag = value;
        tagChanged.dispatch(tag);
      }
    }

    function getSelectedItem() {
      return selectedItem;
    }

    function setSelectedItem(value) {
      if (selectedItem !== value) {
        selectedItem = value;
      }
    }

    function createItemsByYearGap() {
      var yearDif = configModel.endYear - configModel.startYear;
      var totalYear = Math.floor((yearDif) / configModel.gapYear);
      var area;
      var list;
      var len;
      var item;
      var yearIndex;

      // reset the array
      itemsByYearGap = [];

      for (var p = 0; p < totalYear; p++) {
        // creates an array for each yearGap
        itemsByYearGap.push([]);
      }

      for (var key in data) {
        area = key;
        list = data[key].docs;
        len = Object.keys(list).length;

        // separete them by year
        for (var docNum in list) {
          item = list[docNum];
          yearDif = item.year - configModel.startYear;
          yearIndex = Math.floor(yearDif / configModel.gapYear);
          itemsByYearGap[yearIndex].push(item);
        }
      }
    }

    function createTagRelations() {
      var prop;
      var docNum;
      var items; // items per area
      var item;
      var i;
      // reset relations
      tagsDict = {};

      for (prop in data) {
        items = data[prop].docs;

        for (docNum in items) {
          item = items[docNum];

          for (i = 0; i < item.tags.length; i++) {
            addItemByTag(item, item.tags[i]);
          }
        }
      }
    }

    function addItemByTag(item, tag) {
      if (tagsDict[tag] === undefined) {
        // create the array for the tag Key
        tagsDict[tag] = [item];
      } else {
        if (tagsDict[tag].indexOf(item) === -1) {
          // append to the array
          tagsDict[tag].push(item);
        }
      }
    }

    function getItemsByTag(tag) {
      var list = tagsDict[tag] || [];
      return list.concat();
    }

    /**
     * Get related record by Topic and Year (gap of year)
     * remember that a Topic is not a Tag, ACMS is confusing so for phase1
     * and 2 the topics were converted intro tags, so one topic can be 1 or
     * more tags, ex: topic "city & town streets" will have "city" and
     * "town-streets" as tags.
     * The conversion from topics to tags uses the same principles to get
     * the data from ACMS using python.
     *
     * @param  {String} topic ex: "city & town streets"
     * @param  {Number} year  ex: 1947  it will be converted using the
     *                        yearGap.
     *                        So it will be 1945, it always reduce the
     *                        difference so the years in use will be
     *                        1945 to 1949. Using a 5 years gap.
     * @return {Array}        List of unique records found by tags,
     *                        ordered by year.
     */
    function getItemsByTopicAndYearGap(topic, year) {
      var tags = convertTopicToTags(topic);
      var list = [];
      var item;
      var listByYear = [];

      for (var i = 0; i < tags.length; i++) {
        var itemsToAdd = getItemsByTag(tags[i]);
        // append items to the list
        Array.prototype.push.apply(list, itemsToAdd);
      }

      var minYear = year - (year % configModel.gapYear);
      var maxYear = minYear + configModel.gapYear;
      var uniqueDocNums = {};

      // check if the item tags contain all tags in the topic.
      var hasAllTags = function(item) {
        var found = 0;
        for (var i = 0; i < tags.length; i++) {
          if (item.tags.indexOf(tags[i]) > -1) {
            found++;
          }
        }
        return found === tags.length;
      };

      // filter list with the year gap;
      for (var j = 0; j < list.length; j++) {
        item = list[j];
        // add item with year between the ranges
        if (item.year >= minYear && item.year < maxYear && hasAllTags(item)) {
          if (!uniqueDocNums.hasOwnProperty(item.docNum)) {
            listByYear.push(item);
            // save the docNum to check the already added ones
            uniqueDocNums[item.docNum] = 1;
          }
        }
      }

      // order items by year
      listByYear.sort(function(a, b) {
        if (a.year < b.year) {
          return -1;
        } else if (a.year > b.year) {
          return 1;
        }
        return 0;
      });

      return listByYear;
    }

    function convertTopicToTags(topic) {
      var tagsStr = topic;
      var finalTags = [];
      // change comma to pipe
      tagsStr = tagsStr.replace(/,/gi, '|');

      // remove parentesis
      tagsStr = tagsStr.replace(/\(|\)|\./gi, '');
      var mtags = tagsStr.split('|');

      for (var i = 0; i < mtags.length; i++) {
        var tag = mtags[i].replace(/&amp;/gi, '&');
        var t = tag.trim().split(' & ');

        for (var j = 0; j < t.length; j++) {
          // remove spaces and convert to lower case
          finalTags.push(t[j].replace(/ /g, '-').toLowerCase());
        }
      }

      return finalTags;
    }

    function getItemsByYearGap(yearGapIndex) {
      if (yearGapIndex >= 0 && yearGapIndex < itemsByYearGap.length) {
        return itemsByYearGap[yearGapIndex];
      }
      return [];
    }

    function getItemsByAreaAndYearGap(area, yearGapIndex) {
      var list = getItemsByYearGap(yearGapIndex);
      var areaItems = [];

      for (var i = 0; i < list.length; i++) {
        if (list[i].area === area) {
          areaItems.push(list[i]);
        }
      }

      return areaItems;
    }

    function getTunnelItemsData() {
      return tunnelItemsData;
    }

    /**
     * Create the tunnelView list data with maximun of 260 items
     *
     */
    function createTunnelItemsData() {
      var list;
      var len;
      var item;
      var max = 260;
      var yearDif = configModel.endYear - configModel.startYear;
      var totalYear = Math.floor((yearDif) / configModel.gapYear);
      var itensPerGap = Math.round(max / totalYear);
      var j = 0;

      for (var k = 0; k < totalYear; k++) {
        list = getItemsByYearGap(k);
        len = Math.min(list.length, itensPerGap);

        for (var n = 0; n < len; n++) {
          item = list[n];

          tunnelItemsData.push({
            area: item.area,
            id: 'thumb' + j,
            index: j,
            itemId: item.itemId,
            year: item.year,
            title: item.title,
            docNum: item.docNum,
            don: item.don,
            tags: item.tags,
            thumbUrl: item.thumbUrl,
            imageUrl: item.imageUrl
          });

          j++;
        }
      }
    }
  }
})(window.sl.loom, window.sl.loom.models.configModel);
