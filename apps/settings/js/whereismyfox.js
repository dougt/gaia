/* global SettingsListener */

'use strict';

var WhereIsMyFox = {
  init: function wimf_init() {
    console.log('initializing whereismyfox');

    SettingsListener.observe('whereismyfox.enabled', false, function(value) {
      console.log('whereismyfox.enabled = ' + value);

      var desc = document.getElementById('whereismyfox-desc');
      desc.textContent = value ? 'Enabled' : 'Disabled';

      var chbox = document.querySelector('#whereismyfox-enabled input');
      chbox.checked = value;
      chbox.disabled = false;
    });

    SettingsListener.observe('whereismyfox.registered', false, function(value) {
      var signin = document.getElementById('whereismyfox-signin');
      signin.hidden = value;

      var settings = document.getElementById('whereismyfox-settings');
      settings.hidden = !value;
    });

    var api = null;
    var lock = SettingsListener.getSettingsLock();
    lock.get('whereismyfox.api_url').onsuccess = function() {
      api = this.result['whereismyfox.api_url'];
    };

    var loginButton = document.getElementById('whereismyfox-login');
    loginButton.addEventListener('click', function() {
      window.addEventListener('message', function(event) {
        SettingsListener.getSettingsLock().set({
          'whereismyfox.assertion': event.data
        });

        SettingsListener.getSettingsLock().set({
          'whereismyfox.enabled': true
        });
      }, false);

      var iframe = document.createElement('iframe');
      iframe.src = api + '/static/persona_iframe.html';
      console.log(iframe.src);
      document.body.appendChild(iframe);
    });

    var chbox = document.querySelector('#whereismyfox-enabled input');
    chbox.onchange = function wimf_toggle() {
      SettingsListener.getSettingsLock().set({
        'whereismyfox.enabled': this.checked
      }).onerror = function() {
        chbox.disabled = false;
      };

      this.disabled = true;
    };
  }
};

navigator.mozL10n.ready(WhereIsMyFox.init.bind(WhereIsMyFox));
