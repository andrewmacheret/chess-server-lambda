import assert from 'node:assert/strict';
import { after, test } from 'node:test';

import { getBestMove, handler, stopEngine } from './index.js';

const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

after(stopEngine);

test('returns a move for the starting position', async () => {
  const result = await handler({ fen: startFen, depth: '10' });
  assert.match(result.bestmove, /^[a-h][1-8][a-h][1-8]$/);
  assert.match(result.ponder, /^[a-h][1-8][a-h][1-8]$/);
  assert.equal(result.actualdepth, 10);
  assert.equal(result.interrupted, false);
});

test('handles a position from the middle of a game', async () => {
  const fen = 'rnbqk2r/pp3ppp/3ppn2/3p4/2PP4/4PN2/PP3PPP/RN1QKB1R b KQkq - 0 6';
  const result = await handler({ fen, depth: '10' });
  assert.match(result.bestmove, /^[a-h][1-8][a-h][1-8]$/);
});

test('finds mate in one', async () => {
  const result = await handler({ fen: '6k1/5ppp/8/8/8/8/8/K3R3 w - - 0 1', depth: '5' });
  assert.equal(result.bestmove, 'e1e8');
});

test('returns (none) when there are no legal moves', async () => {
  const result = await handler({ fen: '7k/5QQ1/8/8/8/8/8/K7 b - - 0 1' });
  assert.equal(result.bestmove, '(none)');
});

test('promotes a pawn', async () => {
  // c8=Q and c8=R are both mate in one
  const result = await handler({ fen: 'k7/2P5/1K6/8/8/8/8/8 w - - 0 1', depth: '5' });
  assert.match(result.bestmove, /^c7c8[qr]$/);
});

test('defaults the depth and caps it', async () => {
  assert.equal((await handler({ fen: startFen })).actualdepth, 10);
  assert.ok((await handler({ fen: startFen, depth: '99' })).actualdepth <= 20);
});

test('stops at the time limit', async () => {
  const result = await getBestMove({ fen: startFen, depth: 99, timeout: 500 });
  assert.equal(result.interrupted, true);
  assert.ok(result.millis < 1500, `took ${result.millis} ms`);
});

test('requires a fen', async () => {
  await assert.rejects(handler({}), /Parameter 'fen' is required/);
  await assert.rejects(handler({ fen: '' }), /Parameter 'fen' is required/);
});

test('rejects things that are not a fen', async () => {
  await assert.rejects(handler({ fen: 'garbage' }), /not a valid FEN/);
  await assert.rejects(handler({ fen: `${startFen}\nquit` }), /not a valid FEN/);
});

test('recovers after stockfish crashes on a bad position', async () => {
  await assert.rejects(handler({ fen: '8/8/8/8/8/8/8/8 w - - 0 1' }), /Stockfish crashed/);
  const oddFen = 'rnbqk2r/pp3ppp/3ppn2/3p4/2PP4/4PN2/PP3PPP/RN1QKB1R b kqKQ c4 0 6';
  await assert.rejects(handler({ fen: oddFen }), /Stockfish crashed/);
  const result = await handler({ fen: startFen });
  assert.match(result.bestmove, /^[a-h][1-8][a-h][1-8]$/);
});
