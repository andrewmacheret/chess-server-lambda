#!/usr/bin/env bash -e

source config/variables

echo
echo "Building lambda bundle ..."
./build-lambda-bundle.sh

echo
echo "Updating $LAMBDA_FUNCTION_NAME lambda function ..."
aws lambda update-function-code \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --zip-file "fileb://lambda-build.zip"

echo
echo 'Done!'
