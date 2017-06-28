(function(classPath) {
  'use strict';

  // Jquery.ajax docs
  // http://api.jquery.com/jQuery.ajax/
  // Trove API documentation
  // http://help.nla.gov.au/trove/building-with-trove/api-technical-guide#indexes

  var TROVE_KEY = 'agvc8ipol63aeodp';
  var TROVE_API = 'http://api.trove.nla.gov.au/result';

  // global object
  classPath.TroveService = {
    getAllByTopic: getAllByTopic,
    getSearchUrl: getSearchUrl
  };

  function getAllByTopic(topic, location, yearStart) {
    var decade = Math.floor(Number(yearStart) / 10);
    var yearEnd = Number(yearStart) + 4;
    // dont need to use encodeURI because the Jquery.ajax already does it
    var strYears = '?';
    for (var year = yearStart; year <= yearEnd; year++) {
      strYears += '&l-year=' + year;
    }

    if (location === '' || location === 'all') {
      location = 'Sydney';
    }

    var data = {
      'key': TROVE_KEY,
      // use single quotes to search as a phrase
      'q': location + ' "' + topic + '"',
      // 'q': '\'' + topic + '\' date:[' + yearStart + ' TO ' + yearEnd + ']',
      // we dont need any records, just the total
      'n': 0,
      'zone': 'all',
      'sortby': 'dateAsc',
      'encoding': 'json',
      'l-advstate': 'New+South+Wales',
      'l-decade': decade
    };

    return $.ajax({
      url: TROVE_API + strYears,
      dataType: 'jsonp',
      data: data
    });
  }

  function getSearchUrl(searchType, topic, location, yearStart) {
    var decade = Math.floor(Number(yearStart) / 10);
    var yearEnd = Number(yearStart) + 4;
    var url = 'http://trove.nla.gov.au/';

    if (location === '' || location === 'all') {
      location = 'Sydney';
    }

    location = window.encodeURIComponent(location);
    topic = window.encodeURIComponent(topic);

    url += searchType;
    url += '/result?q=';
    // url += window.encodeURI('"' + topic + '" "' + location + '"');
    url += location + '+%22' + topic + '%22';
    url += '&l-advstate=New+South+Wales&sortby=dateAsc';

    if (searchType === 'newspaper') {
      // specific for news search
      url += '&dateFrom=' + yearStart + '-01-01&dateTo=' + yearEnd + '-12-31';
    } else {
      // get whole decade
      url += '&l-decade=' + decade;

      // get only selected year from the decade
      for (var year = yearStart; year <= yearEnd; year++) {
        url += '&l-year=' + year;
      }
    }

    return url;
  }
})(window.sl.loom.services);
