/* global reqwest */
/* global SettingsListener */
/* exported WhereIsMyFoxRequester */

'use strict';

var WhereIsMyFoxRequester = {
  _url: null,

  API_URL_SETTING: 'whereismyfox.api_url',

  API_VERSION_SETTING: 'whereismyfox.api_version',

  WIMF_SESSION_STORAGE_KEY: 'whereismyfox-session',

  init: function wimfr_init() {
    var self = this;

    var baseURL = '', version = '';
    var urlreq = SettingsListener.getSettingsLock().get(this.API_URL_SETTING);
    urlreq.onsuccess = function wimfr_api_url_onsuccess() {
      baseURL = this.result[self.API_URL_SETTING];
      self._url = baseURL + '/' + version;
    };

    var vreq = SettingsListener.getSettingsLock().get(this.API_VERSION_SETTING);
    vreq.onsuccess = function wimfr_api_version_onsuccess() {
      version = this.result[self.API_VERSION_SETTING];
      self._url = baseURL + '/' + version;
    };
  },

  getSessionCookie: function wimfr_getsession() {
    return window.localStorage.getItem(this.WIMF_SESSION_STORAGE_KEY);
  },

  setSessionCookie: function wimfr_setsession(session) {
    window.localStorage.setItem(this.WIMF_SESSION_STORAGE_KEY, session);
  },

  reqwest: function wimfr_reqwest(options) {
    var self = this;
    if (!options.headers) {
      options.headers = {};
    }

    if (options.url.startsWith('/')) {
      options.url = this._url + options.url;
    }

    /* jshint -W069 */

    // use session cookie if we have one
    // XXXggp why, you may wonder? see bug 901697 and
    // https://github.com/mozilla/persona/issues/3205#issuecomment-16193067.
    var session = this.getSessionCookie();
    if (session) {
      options.headers['Cookie'] = session;
    }

    options.headers['Connection'] = 'close';
    options.xhrOpts = {mozSystem: true};

    /* jshint +W069 */

    var onsuccess = options.success;
    options.success = successHandler;

    var request = reqwest(options);
    function successHandler(response) {
      var xhr = request.request;
      var session = xhr.getResponseHeader('Set-Cookie');
      if (session) {
        self.setSessionCookie(session);
      }

      if (onsuccess) {
        onsuccess(response);
      }
    }
  },

  post: function wimfr_post(url, data, onsuccess, onerror) {
    this.reqwest({
      url: url,
      method: 'POST',
      data: JSON.stringify(data),
      contentType: 'application/json',
      type: 'json',
      success: onsuccess,
      error: onerror
    });
  }
};

navigator.mozL10n.ready(WhereIsMyFoxRequester.init.bind(WhereIsMyFoxRequester));
