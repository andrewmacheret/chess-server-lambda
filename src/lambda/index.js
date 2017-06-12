var urlencode = require('urlencode');
var stockfish = require('stockfish');

exports.handler = function(event, context, callback) {
  console.log('called with event:', event);

  var fen = event.fen;
  if (!fen) {
    var suggestion = '/moves?fen=' + urlencode('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1') + '&depth=15';
    callback("Parameter 'fen' is required, try " + suggestion);
    return;
  }

  var depth = parseInt(event.depth, 10) || 15;
  depth = Math.min(depth, 20);

  getBestMove({fen: fen, depth: depth}, function(moveResponse, err) {
    console.log('getBestMove returned', moveResponse, err);

    if (err) {
      callback(err);
      return;
    }

    callback(null, {'bestmove': moveResponse, 'depth': depth});
  });
};

function getBestMove(options, callback) {
  var instance = stockfish();

  // set the callback for each message
  instance.onmessage = function(event) {
    var message = event.data || event;
    
    console.log(typeof event, event);
    
    if (typeof message === 'string') {
      //'bestmove g1f3 ponder g8f6'
      var split = message.split(/ +/);
      if (split[0] == 'bestmove') {
        callback(split[1]);
      }
    }
  };

  // set the fen, then perform the search with the given depth
  instance.postMessage('position fen ' + options.fen);
  instance.postMessage('go depth ' + options.depth);
}
