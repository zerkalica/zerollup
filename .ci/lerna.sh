#!/bin/sh

REPOSITORY=$(git config --get remote.origin.url | cut -d ':' -f 2)
BRANCH=$(git symbolic-ref --short HEAD)

git config --global user.email test@example.com
git config --global user.name "Marty Mcfly"
echo "setup remote for $REPOSITORY / $BRANCH"
git remote add ci "https://${GH_TOKEN}@github.com/${REPOSITORY}"
git branch --set-upstream-to=ci/$BRANCH $BRANCH

echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > .npmrc

for package in ./packages/*/; do
  echo "//registry.npmjs.org/:_authToken=\${NPM_TOKEN}" > $package/.npmrc
done
