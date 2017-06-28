(function(app) {
  'use strict';

  /**
   * Display data from trove and link the items to an external page
   *
   */
  var DetailsTroveHtml = function() {
    this.topic = '';
    this.location = '';
    this.year = 0;
    this.container = document.createElement('div');
    this.container.className = 'topic-details-trove';
    this.container.style.visibility = 'hidden';
    this.troveCache = {};
    this.y = -230;

    this.title = document.createElement('div');
    this.title.className = 'heading';
    this.title.innerHTML = 'Related Content on Trove';
    this.container.appendChild(this.title);

    this.messageClickBind = this.onMessageClick.bind(this);
    this.message = document.createElement('div');
    this.message.className = 'message';
    this.message.addEventListener('click', this.messageClickBind, false);
    this.container.appendChild(this.message);

    this.ul = document.createElement('ul');
    this.container.appendChild(this.ul);

    document.body.appendChild(this.container);
  };

  DetailsTroveHtml.prototype = {

    constructor: DetailsTroveHtml,

    destroy: function() {
      clearTimeout(this.requestTimeout);
      while (this.container.firstChild) {
        this.container.removeChild(this.container.firstChild);
      }

      if (this.troveXHR) {
        this.troveXHR.abort();
      }

      TweenMax.killTweensOf(this.container);
      document.body.removeChild(this.container);

      this.message.removeEventListener('click', this.messageClickBind);
      this.messageClickBind = null;

      this.container = null;
      this.location = null;
      this.message = null;
      this.title = null;
      this.topic = null;
      this.troveCache = null;
      this.troveXHR = null;
      this.ul = null;
      this.year = null;
    },

    close: function() {
      TweenMax.killTweensOf(this.container);
      this.cancelCurrentRequest();
      TweenMax.to(this.container, 0.4, {
        y: -260, autoAlpha: 0, ease: Back.easeIn});
    },

    open: function() {
      TweenMax.set(this.container, {y: this.y - 30});
      TweenMax.to(this.container, 0.4, {
        y: this.y, autoAlpha: 1, ease: Back.easeOut, delay: 0.5});

				if (this.year !== 0) {
					this.loadDataByYear();
				}
				// force load again when open if it was canceled before

    },

    setTopicAndLocation: function(topic, location) {
      this.topic = topic;
      this.location = location;
    },

    setYear: function(value) {
      if (value !== this.year) {
        this.year = value;

        // visible
        if (this.container.style.display !== 'none') {
          this.ul.style.display = 'none';
          // this.message.innerHTML = 'Loading Trove data ...';
          this.message.style.display = 'block';
          this.tries = 0;
          this.loadDataByYear();
        }
      }
    },

    cancelCurrentRequest: function() {
      if (this.troveXHR) {
        // abort previous request
        this.troveXHR.abort();
      }
      clearTimeout(this.requestTimeout);
    },

    loadDataByYear: function() {
      var scope = this;
      var str;
      var requestTime = 1000;
      this.cancelCurrentRequest();

			var key = this.topic + this.location + this.year;
      key = key.replace(/ /gi, '-');

      // use cache if it exists;
      if (this.troveCache.hasOwnProperty(key)) {
        this.updateInfo(this.troveCache[key]);
        return;
      }

      if (this.tries === 0) {
        this.message.innerHTML = 'Loading Trove data ...';
      } else if (this.tries <= 3) {
        str = 'Attempting to load again... ';
        str += scope.tries + ' / 3';
        this.message.innerHTML = str;
        requestTime = 5000;
      } else {
        str = 'Unfortunately we have not been able to load the data.';
        str += '<p><a class="trove-reload-btn">Try again</a><p>';
        this.message.innerHTML = str;
        return;
      }

      // timeout to limit the number of requests =)
      this.requestTimeout = setTimeout(function() {
        scope.troveXHR = app.services.TroveService
          .getAllByTopic(scope.topic, scope.location, scope.year);

        scope.troveXHR.done(function(data) {
          scope.troveCache[key] = data.response;
          scope.updateInfo(data.response);
        })
        .fail(function(error) {
          console.log('Deferred.fail called.', error);
          scope.tries++;
          scope.loadDataByYear();
        });
      }, requestTime);
    },

    // Loading trove data....
    // Attempting to load again... 1/3, 2/3, 3/3
    // Unfortunately we have not been able to load the data. <Try again>

    updateInfo: function(data) {
      var html = '';
      var zones = data.zone;
      var zonesAdded = 0;
      var searchUrl;
      // var color = app.utils.ColorUtils.getColorByYear(this.year);

      zones.sort(function compare(a, b) {
        if (a.name < b.name)
          return -1;
        if (a.name > b.name)
          return 1;
        return 0;
      });

      for (var i = 0; i < zones.length; i++) {
        if (zones[i].records.total > 0) {
          searchUrl = app.services.TroveService.getSearchUrl(zones[i].name,
            this.topic,
            this.location, this.year);
          html += '<li><a href="' + searchUrl + '" target="_blank">' +
          '<span class="title">' + zones[i].name + '</span></a></li>';
          // html += '<li><a href="' + searchUrl + '" target="_blank">' +
          // '<span class="title">' + zones[i].name +
          // '</span><span class="count" style="color:' + color + '">' +
          // zones[i].records.total + '<span></a></li>';
          zonesAdded++;
        }
      }

      if (zonesAdded === 0) {
        this.message.innerHTML = 'No related content found.';
        this.message.style.display = 'block';
        this.ul.style.display = 'none';
      } else {
        this.ul.innerHTML = html;
        this.ul.style.display = 'block';
        this.message.style.display = 'none';
      }
    },

    setY: function(y) {
      // syncs with DetailsHtml panel
      var ease = (y < this.y) ? Power2.easeOut : Power2.easeInOut;
      this.y = y;
      // kill the Y property so it not conflicts with the open animation
      TweenMax.killTweensOf(this.container, {y: true});
      TweenMax.to(this.container, 0.3, {y: y, ease: ease});
    },

    onMessageClick: function(event) {
      console.log('onMessageClick', event);
      if (event.target.className === 'trove-reload-btn') {
        event.preventDefault();
        this.tries = 1;
        this.loadDataByYear();
      }
    }
  };

  app.views.space.details.DetailsTroveHtml = DetailsTroveHtml;
})(window.sl.loom);
