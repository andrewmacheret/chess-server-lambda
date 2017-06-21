#!/usr/bin/env bash -e

# Generate Lambda zip file

echo "Copying files to lambda-build ..."
cp -R ./src/lambda lambda-build
cd lambda-build

echo "Running npm install ..."
npm install

echo 'Testing ...'
npm test || {
 echo 'Tests failed, cleaning up ...'
 cd - >/dev/null
 rm -rf lambda-build
 exit 1
}
echo 'Tests passed!'

echo "Zipping files ..."
zip -q -r ../lambda-build.zip .

echo "Cleaning up ..."
cd - >/dev/null
rm -rf lambda-build
