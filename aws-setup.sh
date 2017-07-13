#!/usr/bin/env bash -e

source ./config/variables

if [ -z "$(type aws)" ]; then
  echo
  echo "Installing AWS CLI tools."
  pip install awscli
  if -z "$(type aws)"; then
    echo "aws is not in path.. please check and re-run."
    exit 1
  else
    echo
    echo "Running 'aws configure' ..."
    aws configure
  fi
fi

rm -f .env
touch .env

# Create role (and store ARN in .env)
echo
echo "Creating $ROLE_NAME role ..."
role_response="$(
  aws iam get-role \
    --role-name "$ROLE_NAME" 2>/dev/null || \
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "file://$PWD/config/aws-lambda-role-policy.json"
)"
ROLE_ARN=$( echo $role_response | python -c "import sys, json; print(json.load(sys.stdin)['Role']['Arn'])" )
echo "export ROLE_ARN=$ROLE_ARN" >> .env

# Attach policies to the role
echo
echo "Attaching role policy CloudWatchLogsFullAccess to $ROLE_NAME ..."
aws iam attach-role-policy \
  --role-name "$ROLE_NAME" 2>/dev/null \
  --policy-arn "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"

echo
echo "Building lambda bundle ..."
./build-lambda-bundle.sh

# Create lambda function (and store ARN in .env)
echo
echo "Creating $LAMBDA_FUNCTION_NAME lambda function ..."
lambda_response="$(
  aws lambda get-function \
    --function-name "$LAMBDA_FUNCTION_NAME" 2>/dev/null || \
  aws lambda create-function \
    --function-name "$LAMBDA_FUNCTION_NAME" \
    --runtime "$LAMBDA_FUNCTION_RUNTIME" \
    --handler "$LAMBDA_FUNCTION_HANDLER" \
    --role "$ROLE_ARN" \
    --zip-file "fileb://lambda-build.zip"
)"
LAMBDA_FUNCTION_ARN=$( echo $lambda_response | python -c "import sys, json; x=json.load(sys.stdin); print(x.get('Configuration',x)['FunctionArn'])" )
echo "export LAMBDA_FUNCTION_ARN=$LAMBDA_FUNCTION_ARN" >> .env

echo
echo "Updating $LAMBDA_FUNCTION_NAME lambda function configuration ..."
aws lambda update-function-configuration \
  --function-name "$LAMBDA_FUNCTION_NAME" \
  --timeout "$LAMBDA_FUNCTION_TIMEOUT" \
  --memory-size "$LAMBDA_FUNCTION_MEMORY" \
  --description "$LAMBDA_FUNCTION_DESCRIPTION"

echo 'Done!'

echo "
Now set up the following:
 * New certificate in AWS Certificate Manager - chess.XXX.com
 * New API in API gateway for /v1/chess
 * Route 53 mapping for chess.XXX.com to the new API in API gateway
"