#!/bin/bash


docker run --rm -v $PWD:/data quay.io/matsengrp/olmsted bin/process_data.py -i /data/$1 -o /data/build_data -n inferred_naive
