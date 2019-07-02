#!/bin/bash

set -e
set -x

if [ ! -d .git ]; then
    echo 'Please run this script from root directory of the repository' 1>&2
    exit 1
fi

npm install
npm run lint
npm run build

cp ./example/index.html ./example/_index.html

hash="$(git rev-parse HEAD)"

git checkout gh-pages
cp ./example/bundle.js .
mv ./example/_index.html index.html

cp ./node_modules/bulma/css/bulma.min.css ./static/css/
cp ./node_modules/github-fork-ribbon-css/gh-fork-ribbon.css ./static/css/
cp -R ./node_modules/vim-wasm ./static/

git add bundle.js index.html static
git commit -m "Imported from ${hash}"
git show --stat HEAD

echo 'Host this directory with web server and check the page is correct manually.'
echo "If it's ok, push the latest commit to remote."
