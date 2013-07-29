/**
 * @file Holds all CNC Server API controller functions and RESTful interactions
 * abstracted for use in the client side application
 */
cncserver.api = {
  pen: {
   /**
    * Get pen stat without doing anything else. Directly sets state.
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    stat: function(callback){
      _get('pen', {
        success: function(d){
          cncserver.state.pen = d;
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    },

   /**
    * Set pen position up (not drawing)
    * @param {function} callback
    *   Function to callback when done, including data from response body
    * @param {boolean} flop
    *   Set to true to swap pen position state to 1 (down/draw)
    */
    up: function(callback, flop){
      // Short circuit if state already matches local state
      if (cncserver.state.pen.state == flop ? 1 : 0) {
        callback(cncserver.state.pen);
        return;
      }

      _put('pen', {
        data: { state: flop ? 1 : 0}, // 0 is off (no draw), 1 is on (do draw)
        success: function(d){
          cncserver.state.pen = d;
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    },

    // Shortcut call to the above with flop set to true
    down: function(callback) {
      this.up(callback, true);
    },

   /**
    * Reset server state for distanceCounter
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    resetCounter: function(callback){
      _put('pen', {
        data: { resetCounter: 1},
        success: function(d){
          cncserver.state.pen = d;
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    },

   /**
    * Move pen to parking position outside drawing canvas
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    park: function(callback){
      _delete('pen',{
        success: function(d){
          cncserver.state.pen = d;
          cncserver.hideDrawPoint(); // hide drawpoint (will be off draw canvas)
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    },

    /**
    * Reset the server state of the pen position to 0,0, parking position
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    zero: function(callback){
      _put('motors',{
        data: {reset: 1},
        success: function(d){
          cncserver.hideDrawPoint(); // hide drawpoint (will be off draw canvas)
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    },

   /**
    * Set pen to absolute x/y point within defined cncserver canvas width/height
    * @param {object} point
    *   {x,y} point object of coordinate within width/height of canvas to move to
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    move: function(point, callback){
      if (point == undefined) {
        if (callback) callback(false);
        return;
      }

      // Move the visible drawpoint
      cncserver.moveDrawPoint(point);

      var percent = {
        // Remove 1/2in (96dpi / 2) from total width for right/bottom offset
        x: (point.x / (cncserver.canvas.width - 48)) * 100,
        y: (point.y / (cncserver.canvas.height - 48)) * 100
      }

      // Sanity check outputs
      percent.x = percent.x > 100 ? 100 : percent.x;
      percent.y = percent.y > 100 ? 100 : percent.y;
      percent.x = percent.x < 0 ? 0 : percent.x;
      percent.y = percent.y < 0 ? 0 : percent.y;

      _put('pen', {
        data: {
          x: percent.x,
          y: percent.y,
          ignoreTimeout: point.ignoreTimeout
        },
        success: function(d){
          cncserver.state.pen = d;
          if (callback) callback(d);
        },
        error: function(e) {
          callback(false);
        }
      });
    }
  },

  motors: {
   /**
    * Disable motors, allow them to be turned by hand
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    unlock: function(callback){
      _delete('motors', {
        success: callback,
        error: function(e) {
          callback(false);
        }
      });
    }
  },

  tools: {
   /**
    * Change to a given tool
    * @param {string} toolName
    *   Machine name of tool to switch to
    * @param {function} callback
    *   Function to callback when done, including data from response body
    */
    change: function(toolName, callback){
      // Disallow tool changes for different pen modes (no water or paint)
      // TODO: This is pretty hacky and should probably be fixed elsewhere
      switch(parseInt(cncserver.settings.penmode)) {
        case 1: // Dissallow paint
          if (toolName.indexOf('color') !== -1) {
            callback(false); return;
          }
          break;
        case 2: // Dissallow water
          if (toolName.indexOf('water') !== -1) {
            callback(false); return;
          }
          break;
        case 3: // Dissallow All
          callback(false); return;
          break;
      }

      cncserver.hideDrawPoint(); // hide drawpoint (will be off draw canvas)

      // Store the last changed color state
      if (toolName.indexOf('color') !== -1) {
        cncserver.state.color = toolName;
      }

      _put('tools/' + toolName, {
        success: callback,
        error: function(e) {
          callback(false);
        }
      });
    }
  }
};

function _get(path, options) {
  _request('GET', path, options);
}
function _post(path, options) {
  _request('POST', path, options);
}
function _put(path, options) {
  _request('PUT', path, options);
}
function _delete(path, options) {
  _request('DELETE', path, options);
}

function _request(method, path, options) {
  $.ajax({
    url: 'http://localhost:4242/v1/' + path,
    type: method,
    data: options.data,
    success: options.success,
    error: options.error,
    timeout: options.error
  });
}
