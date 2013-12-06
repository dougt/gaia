/* global SettingsListener */
/* global WhereIsMyFoxRequester */
/* global WhereIsMyFoxCommands */

'use strict';

var WhereIsMyFox = {
  _state: null,

  _enabled: false,

  // boolean, use null for uninitialized
  // state since this is the first setting
  // we need to read
  _registered: null,

  _assertion: null,

  _registering: false,

  _reply: {},

  _requester: WhereIsMyFoxRequester,

  _commands: WhereIsMyFoxCommands,

  init: function wimf_init() {
    var self = this;

    SettingsListener.observe('whereismyfox.registered', false, function(value) {
      self._registered = value;

      if (self._registered) {
        self._state = JSON.parse(localStorage.getItem('whereismyfox-state'));
      } else {
        // something must have gone really wrong for us to have
        // a state but still think we're not registered. purge
        // the state anyway in case that happens.
        localStorage.removeItem('whereismyfox-state');
        self._registerIfEnabled();
      }
    });

    SettingsListener.observe('whereismyfox.enabled', false, function(value) {
      self._enabled = value;

      if (self._registered === false) {
        self._registerIfEnabled();
      }
    });

    SettingsListener.observe('whereismyfox.assertion', '', function(value) {
      self._assertion = value;
    });

    navigator.mozSetMessageHandler('push', function(message) {
      console.log('got push notification!');
      if (!self._enabled) {
        return;
      }

      self._replyAndFetchCommands();
    });

    navigator.mozSetMessageHandler('push-register', function(message) {
      console.log('lost push endpoint, re-registering');
      self._registerIfEnabled();
    });

    this._me = JSON.parse(window.localStorage.getItem('me'));
    if (this._me === null) {
      this._registerIfEnabled();
    } else {
      this._refreshIfEnabled();
    }
  },

  _registerIfEnabled: function wimf_register() {
    var self = this;
    if (!this._enabled || !this._assertion || this._registering) {
      return;
    }

    this._registering = true;

    var pushRequest = navigator.push.register();
    pushRequest.onsuccess = function wimf_push_handler() {
      var endpoint = pushRequest.result;

      if (self._enabled && self._assertion) {
        var obj = {
          assert: self._assertion,
          pushurl: endpoint
        };

        if (self._state !== null) {
          obj.deviceid = self._state.deviceid;
        }

        self._requester.post('/register/', obj, function(response) {
          self._state = response;
          window.localStorage.setItem('whereismyfox-state',
            JSON.stringify(self._state));

          SettingsListener.getSettingsLock().set({
            'whereismyfox.registered': true
          });
        }); // TODO and what if this fails?
      }

      self._registering = false;
    };

    pushRequest.onerror = function wimf_push_error_handler() {
      // TODO do anything else?
      self._registering = false;
    };
  },

  _replyAndFetchCommands: function wimf_reply_and_fetch() {
    this._requester.post(
      '/cmd/' + this._state.deviceid,
      this._reply,
      this._processCommands.bind(this),
      this._handleServerError.bind(this));

    this._reply = {};
  },

  _processCommands: function wimf_process_commands(cmdobj) {
    for (var cmd in cmdobj) {
      if (cmd in this._commands) {
        var args = cmdobj[cmd], cb = this._replyCallback.bind(this, cmd);

        console.log('command ' + cmd + ', args ' + JSON.stringify(args));
        this._commands[cmd](args, cb);
      } else {
        this._replyCallback(cmd, false, 'command not available');
      }
    }
  },

  _handleServerError: function wimf_handle_server_error(err) {
    if (err.status === 401) {
      this._registerIfEnabled();
    }
  },

  _replyCallback: function wimf_reply(cmd, ok, retval) {
    var value = {ok: ok};

    if (cmd === 't' && ok === true && retval !== undefined) {
      value.la = retval.coords.latitude;
      value.lo = retval.coords.longitude;
      value.ti = retval.timestamp;
      value.key = (this._commands._passcode !== '');
    } else if (ok === false) {
      value.error = retval;
    }

    this._reply[cmd] = value;
    if (cmd === 't') {
      this._replyAndFetchCommands();
    }
  }
};

navigator.mozL10n.ready(WhereIsMyFox.init.bind(WhereIsMyFox));
