var urlencode = require('urlencode');
var stockfish = require('stockfish');

var maxTimeout = 3000;
var defaultDepth = 10;
var maxDepth = 20;

exports.handler = function(event, context, callback) {
  console.log('called with event:', event);

  var fen = event.fen;
  if (!fen) {
    var suggestion = '/moves?fen=' + urlencode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') + '&depth=' + defaultDepth;
    callback("Parameter 'fen' is required, try " + suggestion);
    return;
  }

  var depth = parseInt(event.depth, 10) || defaultDepth;
  depth = Math.min(depth, maxDepth);

  exports.getBestMove({fen: fen, depth: depth, timeout: maxTimeout}, function(moveResponse, err) {
    console.log('getBestMove returned', moveResponse, err);

    if (err) {
      callback(err);
      return;
    }

    callback(null, moveResponse);
  });
};

exports.getBestMove = function(options, callback) {
  var instance = stockfish();

  var thinking = true;
  var actualDepth = 0;
  var startTimeMillis = Date.now();

  // set the callback for each message
  instance.onmessage = function(event) {
    if (!thinking) {
      return;
    }
    var message = event.data || event;
    
    console.log(typeof event, event);
    
    if (typeof message === 'string') {
      //'bestmove g1f3 ponder g8f6'
      var split = message.split(/ +/);
      if (split[0] == 'bestmove') {
        result = {
          bestmove: split[1],
          actualdepth: actualDepth,
          interrupted: true,
          millis: Date.now() - startTimeMillis
        };

        var ponder = null;
        if (split.length > 3 && split[2] == 'ponder') {
          result.ponder = split[3];
        }

        thinking = false;
        if (timeout) {
          clearTimeout(timeout);
          console.log('timeout cleared');
          result.interrupted = false; 
        }

        callback(result);
      } else if (split[0] == 'info' && split.length > 2 && split[1] == 'depth') {
        actualDepth = parseInt(split[2], 10);
      }

      if (Date.now() - startTimeMillis > options.timeout) {
        timeoutFn();
      }
    }
  };

  // set the fen, then perform the search with the given depth
  postMessage(instance, 'position fen ' + options.fen);
  postMessage(instance, 'go depth ' + options.depth);
  
  var timeoutFn = function() {
    if (timeout == null) {
      return;
    }
    postMessage(instance, 'stop');
    timeout = null;
  };
  var timeout = setTimeout(timeoutFn, options.timeout);
}

var postMessage = function(instance, message) {
  console.log('POSTING: ' + message);
  instance.postMessage(message);
};
