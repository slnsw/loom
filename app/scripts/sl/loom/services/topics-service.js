(function(classPath) {
  'use strict';

  /**
    data structure

      tag {
        total: Number,
        area: Array [ Number(total per year) ]
      }
   **/

  var jsonUrl = 'data/topics.json';
  var maxTopTopics = 20;
  var topTopicsPerArea = {};
  var yearIndexDict = {};
  var yearMin = 1870;
  var yearMax = 2000;
  var yearGap = 5;

  var yearNumIndexes = (yearMax - yearMin) / yearGap;

  // var _tagsPerTopicDict = {};

  var TopicsService = {
    load: load,
    data: {},
    uniqueTopicsDict: {},
    uniqueTopicsKeys: [],
    uniqueTopicsTotal: 0,
    areas: [],
    relateTopicsAndDocuments: relateTopicsAndDocuments
  };

  // Make it public
  classPath.TopicsService = TopicsService;

  // create the year Indexes Dictionary for faster initialization
  for (var y = yearMin, i = 0; y <= yearMax; y += yearGap, i++) {
    yearIndexDict[y] = i;
  }

  function addTopic(topic, count, areaId, year) {
    if (!TopicsService.uniqueTopicsDict.hasOwnProperty(topic)) {
      TopicsService.uniqueTopicsDict[topic] = {
        total: 0,
        key: topic
      };
      TopicsService.uniqueTopicsTotal++;
      TopicsService.uniqueTopicsKeys.push(topic);
    }

    TopicsService.uniqueTopicsDict[topic].total += count;

    if (!TopicsService.uniqueTopicsDict[topic].hasOwnProperty('all')) {
      TopicsService.uniqueTopicsDict[topic].all = new Int16Array(
        yearNumIndexes);
    }

    if (!TopicsService.uniqueTopicsDict[topic].hasOwnProperty(areaId)) {
      TopicsService.uniqueTopicsDict[topic][areaId] = new Int16Array(
        yearNumIndexes);
    }
    var yearIndex = yearIndexDict[year];
    // sum the counter for an area
    TopicsService.uniqueTopicsDict[topic][areaId][yearIndex] += count;

    // always sum for all areas
    TopicsService.uniqueTopicsDict[topic].all[yearIndex] += count;
  }

  function parse(data) {
    var area;

    for (var p in data) {
      if (p !== 'all') {
        area = {
          name: data[p].name,
          id: p,
          // total records per year gap
          counts: {}
        };

        var topics = data[p].topics;
        var year = yearMin;
        for (var i = 0; i < topics.length; i++) {
          // add the total of topics per year gap
          // area.counts.push(topics[i][year].length);
          area.counts[year] = topics[i][year].length;
          year += yearGap;
        }

        TopicsService.areas.push(area);

        // calculate counts
        calculateTopTopics(p, data[p].topics);
      }
    }
    calculateAllLocationsTagsPerYearGap();
    TopicsService.data = data;
  }

  function calculateAllLocationsTagsPerYearGap() {
    var allObj = {
      id: 'all',
      name: 'All locations',
      counts: {}
    };

    for (var y = yearMin; y < yearMax; y += yearGap) {
      allObj.counts[y] = 0;
    }

    // count the number of tags with count > 0 foir each gap of year accross
    // all location
    var topic;

    // check each topic
    for (var topicKey in TopicsService.uniqueTopicsDict) {
      if (TopicsService.uniqueTopicsDict.hasOwnProperty(topicKey)) {
        var curYear = yearMin;
        // get topic object
        topic = TopicsService.uniqueTopicsDict[topicKey];
        for (var j = 0; j < topic.all.length; j++) {
          // count on ALL only if the topic has a count > 1
          if (topic.all[j] > 0) {
            allObj.counts[curYear]++;
          }
          curYear += yearGap;
        }
      }
    }
    TopicsService.areas.push(allObj);
  }

  function load() {
    var deferred = new $.Deferred();
    $.ajax(jsonUrl).then(function(response) {
      parse(response);
      deferred.resolve();
    });

    return deferred.promise();
  }

  function calculateTopTopics(areaId, topics) {
    var topTopics = [];
    var topicDict = {};
    var len;
    var topicLabel;
    var topicCount;

    topics.forEach(function(yearObj) {
      for (var year in yearObj) {
        if (yearObj.hasOwnProperty(year)) {
          len = yearObj[year].length;
          for (var i = 0; i < len; i++) {
            topicLabel = yearObj[year][i][0];
            topicCount = Number(yearObj[year][i][1]);

            if (!topicDict.hasOwnProperty(topicLabel)) {
              // create
              topicDict[topicLabel] = 0;
            }

            addTopic(topicLabel, topicCount, areaId, year);
            topicDict[topicLabel] += topicCount;
          }
        }
      }
    });

    for (var key in topicDict) {
      // add to the array to be sorted
      if (topicDict.hasOwnProperty(key)) {
        topTopics.push([key, topicDict[key]]);
      }
    }

    topTopics.sort(function(a, b) {
      if (a[1] > b[1]) {
        return -1;
      }
      if (a[1] < b[1]) {
        return 1;
      }

      return 0;
    });

    var totalUniqueTopics = topTopics.length;
    var topList = topTopics.slice(0, maxTopTopics);

    topTopicsPerArea[areaId] = {
      totalUniqueTopics: totalUniqueTopics,
      list: topList
    };
  }

  function relateTopicsAndDocuments(areasData) {
    var tagsDics = {};

    // convert all topics intro tags to compare
    var keys = TopicsService.uniqueTopicsKeys;
    keys.forEach(function(topic) {
      var tags = taggify(topic);

      for (var i = 0; i < tags.length; i++) {
        if (tagsDics[tags[i]] === undefined) {
          tagsDics[tags[i]] = [];
        }
      }
    });

    var area;
    var docs;
    var docNum;
    var doc;
    var docsCount = 0;

    for (area in areasData) {
      docs = areasData[area].docs;

      for (docNum in docs) {
        doc = docs[docNum];
        docsCount++;

        // check doc tags
        for (var i = 0; i < doc.tags.length; i++) {
          // check if the tag key existis
          if (tagsDics[doc.tags[i]] !== undefined) {
            // check if the docs was already inserted
            if (tagsDics[doc.tags[i]].indexOf(docNum) === -1) {
              tagsDics[doc.tags[i]].push(docNum);
            }
          }
        }
      }
    }
  }

  /**
   * Convert the topic intro an array of tags
   *
   * @param  {Array} topic - list of topics (String)
   * @return {Array} tags  - list of converted tags (String)
   */
  function taggify(topic) {
    var a = topic.replace(/,/gi, '&');
    var tags = [];

    a = a.split(' & ');

    a.forEach(function(item) {
      var tag = item.replace(/ /gi, '-');
      tag = tag.replace(/[(|)|.]/gi, '');
      tags.push(tag.toLowerCase());
    });

    return tags;
  }
})(window.sl.loom.services);
