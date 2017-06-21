var index = require('./index');

var startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';


function runTest(tests, testIndex) {
  var test = tests[testIndex];

  console.log('\n' + test.description + '...');

  var timeoutFn = setTimeout(function() {
    console.log('ERROR: ' + test.errorTimeoutMillis + ' ms reached');
    process.exit(1);
  }, test.errorTimeoutMillis);

  index.getBestMove(test.options, function(result) {
    if (test.expectInterrupt) {
      if (!result.interrupted) {
        console.log('ERROR: was not interrupted, expected an interruption');
        process.exit(1);
      }
    } else {
      if (result.interrupted) {
        console.log('ERROR: was interrupted, expected no interruption');
        process.exit(1);
      }
    }

    console.log(result);
    clearTimeout(timeoutFn);
    timeoutFn = null;
    
    if (testIndex + 1 < tests.length) {
      runTest(tests, testIndex + 1);
    }
  });
}

var tests = [
  {
    description: 'Testing odd scenario',
    options: {fen: 'rnbqk2r/pp3ppp/3ppn2/3p4/2PP4/4PN2/PP3PPP/RN1QKB1R b kqKQ c4 0 6', depth: 10, timeout: 3000},
    errorTimeoutMillis: 10000,
    expectInterrupt: false
  }/*,
  {
    description: 'Testing short timeout (there should be a STOP)',
    options: {fen: startFen, depth: 99, timeout: 1000},
    errorTimeoutMillis: 5000,
    expectInterrupt: true
  },
  {
    description: 'Testing short depth (there should be NO STOP)',
    options: {fen: startFen, depth: 5, timeout: 5000},
    errorTimeoutMillis: 2000,
    expectInterrupt: false
  },
  {
    description: 'Testing long round (there should be a STOP)',
    options: {fen: startFen, depth: 99, timeout: 10000},
    errorTimeoutMillis: 12000,
    expectInterrupt: true
  }*/


];

runTest(tests, 0);

