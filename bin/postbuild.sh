#!/usr/bin/env bash

set -euf -o pipefail

# Post-build script
# =================

# This script generates a static deployment of the application in the `_deploy` directory.

# make sure the directories exist in case new setup
mkdir -p _deploy/dist _deploy/data
# todo setup default data if doesn't exist

# copy over necessary files
cp index.html _deploy
cp -r src/images/ _deploy
cp -r src/css/ _deploy
