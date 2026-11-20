# Chess AI using Node.js, Stockfish, and AWS Lambda

[![License](https://img.shields.io/badge/license-MIT-lightgray.svg)](https://github.com/andrewmacheret/chess-server-lambda/blob/master/LICENSE.md)

Back-end chess AI for [andrewmacheret/chess](https://github.com/andrewmacheret/chess). It runs [Stockfish 19](https://github.com/nmrugg/stockfish.js) (the lite, single-threaded WebAssembly build) in the Lambda function `ChessAI` on Node.js 24.

See [andrewmacheret/chess-server](https://github.com/andrewmacheret/chess-server) for the previous version that runs on Docker.

## API

`GET https://chess.andrewmacheret.com/moves?fen=<FEN>&depth=<depth>`

- `fen` is required. `depth` defaults to 10 and is capped at 20. Each search stops after 3 seconds.
- Returns something like `{"bestmove":"e2e4","ponder":"c7c5","actualdepth":10,"interrupted":false,"millis":92}`. `bestmove` is `(none)` when there are no legal moves.

API Gateway (REST API `64cbac0f1h`, stage `live`) maps the query string to the Lambda event as `{"fen": "...", "depth": "..."}`.

## Develop

```
cd src/lambda
npm install
npm test
```

## Deploy

Pushing to `master` runs [.github/workflows/deploy.yml](.github/workflows/deploy.yml), which tests, zips `src/lambda` with only the Stockfish engine it uses, updates the `ChessAI` function, and smoke tests the API.

It signs in to AWS with GitHub OIDC using the role in the repo variable `AWS_ROLE_ARN`.
