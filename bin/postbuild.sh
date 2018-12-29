#!/usr/bin/env bash

set -euf -o pipefail

# Post-build script
# =================

# This script generates a static deployment of the application in the `deploy` directory.

# make sure the directories exist in case new setup
mkdir -p deploy/dist deploy/data
# todo setup default data if doesn't exist

# copy over necessary files
cp index.html deploy
cp -r src/images/ deploy
cp -r src/css/ deploy


