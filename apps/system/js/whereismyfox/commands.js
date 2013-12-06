/* global LockScreen */
/* global SettingsListener */

'use strict';

var WhereIsMyFoxCommands = {
  _alarm: null,

  _watchId: null,

  _app: null,

  init: function wimfc_init() {
    var self = this;

    // https://soundcloud.com/awm833/alarm-clock
    this._alarm = new Audio('./resources/sounds/wimf_alarm.mp3');
    this._alarm.mozAudioChannel = 'alarm';
    this._alarm.loop = true;

    this._app = null;
    var appreq = navigator.mozApps.getSelf();
    appreq.onsuccess = function wimfc_getapp_success() {
      self._app = this.result;
    };

    appreq.onerror = function wimfc_getapp_error() {
      console.error('failed to grab reference to app!');
    };

    // TODO check command dependencies here?
    // TODO return list of available commands?
  },

  _setPermission: function wimfc_set_permission(permission, value) {
    if (!this._app) {
      return false;
    }

    try {
      navigator.mozPermissionSettings.set(
        'geolocation', 'allow', this._app.manifestURL, this._app.origin, false);
    } catch (exc) {
      return false;
    }

    return true;
  },

  t: function wimfc_track(args, reply) {
    var duration = args.d;

    if (this._watchId !== null) {
      if (duration === 0) {
        // stop tracking
        navigator.geolocation.clearWatch(this._watchId);
        this._watchId = null;
      }

      reply(true);
      return;
    }

    if (!navigator.mozPermissionSettings) {
      reply(false, 'mozPermissionSettings is missing');
      return;
    }

    if (!this._setPermission('geolocation', 'allow')) {
      reply(false, 'failed to set geolocation permission!');
      return;
    }

    this._watchId = navigator.geolocation.watchPosition(
      function wimfc_watchposition_success(position) {
        console.log('updating location to (' +
          position.coords.latitude + ', ' +
          position.coords.longitude + ')'
        );

        reply(true, position);
      }, function wimfc_watchposition_error(error) {
        reply(false, 'failed to get location: ' + error.message);
      }
    );
  },

  e: function wimfc_erase(args, reply) {
    if (navigator.mozPower && navigator.mozPower.factoryReset) {
      navigator.mozPower.factoryReset();
    } else {
      // FIXME can this really happen?
      reply(false, 'mozPower is not available!');
    }
  },

  l: function wimfc_lock(args, reply) {
    var message = args.m, passcode = args.c;

    if (LockScreen.enabled && LockScreen.passCode) {
      // keep existing passcode
      passcode = this._passcode;
    }

    SettingsListener.getSettingsLock().set({
      'lockscreen.enabled': true,
      'lockscreen.lock-message': message,
      'lockscreen.notifications-preview.enabled': false,
      'lockscreen.passcode-lock.enabled': true,
      'lockscreen.passcode-lock.code': passcode
    }).onsuccess = function() {
      LockScreen.lockIfEnabled(true);
      reply(true);
    };
  },

  r: function wimfc_ring(args, reply) {
    var self = this;

    // are we already ringing?
    if (!this._alarm.paused) {
      reply(true);
      return;
    }

    SettingsListener.getSettingsLock().set({
      // hard-coded max volume taken from
      // https://wiki.mozilla.org/WebAPI/AudioChannels
      'audio.volume.alarm': 15
    }).onsuccess = function() {
      self._alarm.play();
      reply(true);
    };

    var duration = parseInt(args.d);
    duration = isNaN(duration) ? 1 : duration;

    setTimeout(function() {
      self._alarm.pause();
      self._alarm.currentTime = 0;
    }, duration * 1000);
  }
};

navigator.mozL10n.ready(WhereIsMyFoxCommands.init.bind(WhereIsMyFoxCommands));
