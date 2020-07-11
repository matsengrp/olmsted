#!/bin/bash

port="${2:-3999}"
echo "using port: $port"

docker run -p $port:3999 -v $PWD:/data quay.io/matsengrp/olmsted:$1 npm start localData /data
