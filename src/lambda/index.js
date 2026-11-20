import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

import stockfish from 'stockfish';

const maxMillis = 3000;
const defaultDepth = 10;
const maxDepth = 20;
const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// board, side to move, castling, en passant, then optional move counters
const fenPattern = /^[pnbrqkPNBRQK1-8]+(\/[pnbrqkPNBRQK1-8]+){7} [wb] (-|[KQkq]{1,4}) (-|[a-h][1-8])( \d+ \d+)?$/;

const enginePath = stockfish.findEngine('lite-single');

// Stockfish runs in its own process because some bad positions make it crash.
// One process is kept per Lambda container and reused while the container stays warm.
// If it dies, the next request starts a new one.
let engine = null;
const getEngine = () => {
  if (engine) {
    return engine;
  }
  const child = spawn(process.execPath, [enginePath], { stdio: ['pipe', 'pipe', 'pipe'] });
  // a crash prints the whole minified engine, so only keep the end of stderr
  let stderr = '';
  child.stderr.on('data', (data) => {
    stderr = (stderr + data).slice(-500);
  });
  const current = {
    listener: null,
    onExit: null,
    send: (command) => {
      console.log('POSTING:', command);
      child.stdin.write(`${command}\n`);
    },
    kill: () => child.kill(),
  };
  createInterface({ input: child.stdout }).on('line', (line) => current.listener?.(line));
  child.stdin.on('error', (err) => console.error('stockfish stdin error', err));
  child.on('exit', (code, signal) => {
    console.error('stockfish exited', { code, signal, stderr: stderr.trim() });
    if (engine === current) {
      engine = null;
    }
    current.onExit?.();
  });
  engine = current;
  return current;
};

export const handler = async (event) => {
  console.log('called with event:', event);

  const fen = (event.fen || '').trim();
  if (!fen) {
    const suggestion = `/moves?fen=${encodeURIComponent(startFen)}&depth=${defaultDepth}`;
    throw new Error(`Parameter 'fen' is required, try ${suggestion}`);
  }
  if (!fenPattern.test(fen)) {
    throw new Error(`Parameter 'fen' is not a valid FEN: ${fen}`);
  }

  const depth = Math.min(parseInt(event.depth, 10) || defaultDepth, maxDepth);

  const result = await getBestMove({ fen, depth, timeout: maxMillis });
  console.log('getBestMove returned', result);
  return result;
};

export const getBestMove = ({ fen, depth, timeout }) =>
  new Promise((resolve, reject) => {
    const instance = getEngine();
    const startTimeMillis = Date.now();
    let actualDepth = 0;

    const finish = () => {
      clearTimeout(giveUp);
      instance.listener = null;
      instance.onExit = null;
    };

    // if stockfish never answers, kill it so the next request gets a fresh one
    const giveUp = setTimeout(() => {
      finish();
      instance.kill();
      reject(new Error(`No move after ${timeout + 2000} ms`));
    }, timeout + 2000);

    instance.onExit = () => {
      finish();
      reject(new Error(`Stockfish crashed on fen ${fen}`));
    };

    instance.listener = (line) => {
      // 'info depth 10 seldepth 14 ...' or 'bestmove g1f3 ponder g8f6'
      const split = line.split(/ +/);
      if (split[0] === 'info' && split[1] === 'depth') {
        actualDepth = parseInt(split[2], 10);
      } else if (split[0] === 'bestmove') {
        finish();
        const result = {
          bestmove: split[1],
          actualdepth: actualDepth,
          interrupted: actualDepth < depth,
          millis: Date.now() - startTimeMillis,
        };
        if (split[2] === 'ponder') {
          result.ponder = split[3];
        }
        resolve(result);
      }
    };

    instance.send('ucinewgame');
    instance.send(`position fen ${fen}`);
    // stops at whichever comes first: the depth or the time limit
    instance.send(`go depth ${depth} movetime ${timeout}`);
  });

// lets tests end the process cleanly
export const stopEngine = () => engine?.kill();
