#!/bin/sh

REPOSITORY=$(git config --get remote.origin.url | sed "s/^\(https:\/\/\)\(.*\)/\1${GH_TOKEN}@\2/")
BRANCH=master

git checkout $BRANCH
git config --global user.email test@example.com
git config --global user.name "Marty Mcfly"
echo "setup remote for $(git config --get remote.origin.url) $BRANCH"
git remote add ci ${REPOSITORY}

echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc

for package in ./packages/*/; do
  echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > $package/.npmrc
done
