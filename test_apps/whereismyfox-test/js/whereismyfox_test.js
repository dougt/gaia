'use strict';

window.onload = function() {
  var systemPort = null;
  navigator.mozApps.getSelf().onsuccess = function() {
    var app = this.result;
    app.connect('whereismyfoxtestcomms').then(function(ports) {
      if (ports.length !== 1) {
        console.error('got more than one connection?');
        return;
      }

      systemPort = ports[0];
    }, function(err) {
      console.error('failed to connect: ' + err);
    });
  };

  var buttons = document.getElementsByTagName('button');
  for (var i = 0; i < buttons.length; i++) {
    (function (command) {
      buttons[i].addEventListener('click', function() {
        var cmdobj = {};
        cmdobj[command] = {};
        systemPort.postMessage(cmdobj);
      });
    })(buttons[i].textContent[0].toLowerCase());
  }
};
