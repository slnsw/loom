(function(app) {
  'use strict';

  // it will be singleton
  // items in config.json will be injected in this object
  app.models.configModel = {};

  /* Example
  {
    "acmsItemUrl":
      "http://acmssearch.sl.nsw.gov.au/search/itemDetailPaged.cgi?itemID=",
    "backgroundDark": "#222222",
    "backgroundLight": "#e0e0de",
    "backrourColor": "#e0e0de",
    "colorsByYear": ["#f63440","#f5423b","#f45036","#f45e32","#f36d2d",
      "#f27b28","#f18923","#da923a","#c39b51","#aca468","#95ac7f","#7eb596",
      "#67bead","#5cbbb6","#52b7bf","#47b4c8","#3cb1d0","#32add9","#27aae2",
      "#3494d2","#407dc2","#4c67b2","#5950a2","#663a92","#722382","#852082",
      "#981d81","#ac1b81","#bf1881","#d21580","#e51280"],
    "endYear": 2000,
    "gapYear": 5,
    "itemsPerPage": 20,
    "startYear": 1870,
    "textColor": "#4d4e56",
    "thumbHeight": 128,
    "thumbWidth": 128
    "windowMinHeight": 768,
    "windowMinWidth": 1024,
  }
  */
})(window.sl.loom);
