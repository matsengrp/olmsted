# Olmsted

![tree logo](src/images/olmsted.svg)

*After landscape architect [Fredrick Law Olmsted](https://en.wikipedia.org/wiki/Frederick_Law_Olmsted)*


## Introduction

Olmsted is an open-source tool for visualizing and exploring B cell lineages.

B cells code for and generate _antibodies_, proteins which stick to some exposed structure (_antigen_), typically on a foreign object such as a virus or bacterium.
Recently, it has become possible to deep sequence B-cell receptor genes (millions of sequences per sample in some cases), giving us an in depth snapshot of the adaptive immune system at a point in time.
B cells evolve in a process called _affinity maturation_ from randomly generated starting sequences, which means that we can represent the data as a collection of phylogenetic trees.
These trees are commonly called _lineages_.

Olmsted combines powerful interactive data visualizations as part of an explorer flow in which repertoires can be explored in depth, unlocking a bird's eye view of this data.

You can visit a live demo application at <http://olmstedviz.org>, and use the guide below to direct your time there.


## Guide

When you first hit the application at it's root address, you'll be presented with a page where you can select data for exploration.

![splash](docs/splash.png)

Once selected, hitting "Explore" takes you to a page displaying selected datasets using the following visualizations:


### Clonal lineage scatterplot

The top level component in the explorer view is a scatterplot of all the clonal lineages in your selected datasets.
The axes, color and symbol mappings are all customizable.

![scatterplot](docs/scatterplot-viz.png)

It's also possible to facet the visualization by a variable, which splits it up into separate panes, one for each value corresponding to the selected variable.
For example, we might want to facet by subject to get a better sense of how trends compare between subjects

![facet](docs/facet.png)


### Clonal lineage table

In the main clonal lineage scatterplot, you can click and drag to select a set of points in the plot.
When you do, the selection acts as a filter for the clonal lineages table.

This table shows additional details about the selected clonal lineages, including a visual encoding of the gene rearrangement responsible for the clonal lineage's naive B-cell.
You can also click on a column header of the table to sort by that column.

![tree align view](docs/clonal-lineages-table2.png)


### Tree and alignment view

Clicking on a row of the table presents further details about the clonal lineage, including a phylogenetic tree of select sequences from the lineage, and a visualization of the mutation patterns in the selected sequences.
As with other visualizations in the application, the details of color and node size can be controlled.

![tree align view](docs/tree-align-view.png)


### Lineage view

Clicking on a tip in the phylogenetic tree displays additional details about the series of mutations leading up to the sequence in question.

![lineage view](docs/lineage-view.png)

## Installation

Olmsted's dependencies are described in the Dockerfile. We recommend that you run Olmsted inside a Docker container, since this will make installation much easier (if you're new to Docker, read [this](http://erick.matsen.org/2018/04/19/docker.html)). However, you can also install the dependencies by hand, in which case you should clone the repository and run each command in the [Dockerfile](https://github.com/matsengrp/olmsted/blob/master/Dockerfile) that's on a line starting with RUN (treat WORKDIR as cd).

## Preparing input data

### Data processing dependencies
The necessary python depencies for processing input data are installed in the Docker image using conda.
You may also install them directly on your machine by running the `conda install` command from the [Dockerfile](https://github.com/matsengrp/olmsted/blob/master/Dockerfile).

### Input format
Olmsted input data is through a [JSON schema](https://json-schema.org/) that extends the [AIRR schema](https://github.com/airr-community/airr-standards/blob/master/specs/airr-schema.yaml).
For a human-readable version of the schema, see [olmstedviz.org/schema.html](http://www.olmstedviz.org/schema.html) or view [schema.html](https://github.com/matsengrp/olmsted/blob/master/schema.html) on [htmlpreview.github.io](https://htmlpreview.github.io)

### Validation
Input data is processed using the script `bin/process_data.py` to ensure required fields using the schema.
The script takes any number of JSON files, each one containing one complete dataset.
It breaks this apart into files summarizing individual records in the dataset (e.g. clonal lineages, trees) which can be served to the Olmsted client and visualized.

Here is an example of how to parse input JSON files using `bin/process_data.py` in Docker:

1. Change to the directory where you have your input JSON file(s) (this example uses the data from this repository):
```
git clone https://github.com/matsengrp/olmsted.git && cd olmsted/example_data
```

2. Run `bin/process_data.py` in Docker using `-v` to mount the current directory to `/data` in the container: 
```
docker run --rm -v $(pwd):/data quay.io/matsengrp/olmsted bin/process_data.py -i /data/full_schema_dataset.json -o /data/build_data -n inferred_naive
```

Run ` ./bin/process_data.py --help` for more on how to run that Python script to parse your data according to the schema.

## Deployment with Docker

1. Install [Docker](https://www.docker.com/get-started)
2. Choose a port number available to you locally, e.g. 8080
3. Choose a [version tag](https://quay.io/repository/matsengrp/olmsted?tab=tags) e.g. `v2.0.0-10-gab82117` - we recommend that you choose a specific tag even if you want the latest version, i.e. that you don't use the `latest` tag, if you want to be able to reproduce your efforts later.
4. Run:
```
docker run -p 8080:3999 quay.io/matsengrp/olmsted
```
5. Navigate to `localhost:8080` in your browser to see the application.

To run an interactive session in the container:
```
docker run -it quay.io/matsengrp/olmsted /bin/bash
```

### Specifying input data
The command that starts the Olmsted local server is `npm start localData`, followed by the location of your input JSON(s) (which should be the output, i.e. `-o`, from `bin/process_data.py` above).
To run on your own data instead of the example data, you need to point Docker to your data.
To access files on your machine from within the Docker container, or to persist output beyond the container, you must [use volumes by specifying -v](http://erick.matsen.org/2018/04/19/docker.html#making-a-directory-available-inside-of-a-container). 

For example, if you wanted to use the example data in this repo, that would look like this:
```
git clone https://github.com/matsengrp/olmsted.git && cd olmsted/example_data/build_data
docker run -p 8080:3999 -v $(pwd):/data quay.io/matsengrp/olmsted npm start localData /data
```

## Deploying without using Docker

Run `npm start localData /local/data/path 8080` (after installing the necessary dependencies specified in the [Dockerfile](https://github.com/matsengrp/olmsted/blob/master/Dockerfile)) and navigate to `localhost:8080` in your browser to see the application.

## Static Build

Olmsted is designed to statically compile as a single page app, which can then be deployed using a simple CDN setup.

To create a static deployment, run `npm run build` from within the project directory (the path to your clone of this repository or `/usr/src/app` in the Docker image). 
This will generate most of a deployment in a `deploy` directory.
To complete the static deployment, you simply have to place the data you want to deploy at `deploy/data`.

You can test the local static build by running the following:

```
cd deploy
python -m SimpleHTTPServer 4000
```

Once you've verified that your static build works, you simply have to deploy the contents to a static file server or CDN.

If you're content deploying with AWS S3, there is a deploy script at `bin/deploy.py` which you can use to push your static deployment up to an S3 bucket.
For deploy script usage run `./bin/deploy.py -h`.
To see what you need to do on the S3 side to acitvate website hosting for a bucket, see: <https://docs.aws.amazon.com/AmazonS3/latest/dev/WebsiteHosting.html>


## Versioning

We use git tags to tag [releases of Olmsted](https://github.com/matsengrp/olmsted/releases) using the [semver](https://semver.org/) versioning strategy.

Tag messages, e.g. `Olmsted version 2.0.1 ; uses schema version 2.0.0`, contain the [version of the input data schema](https://github.com/matsengrp/olmsted/blob/master/bin/process_data.py#L18) with which a given version of Olmsted is compatible.

The tagged release's major version of Olmsted should always match that of its compatible schema version; should we need to make breaking changes to the schema, we will bump the major versions of both Olmsted and the input schema.


## Implementation notes

This application relies on React.js and Redux for basic framework, and Vega and Vega-Lite for the interactive data visualizations.


## License and copyright

Copyright 2019 Christopher Small, Eli Harkins, and Erick Matsen.
Forked from [Auspice](https://github.com/nextstrain/auspice), copyright 2014-2018 Trevor Bedford and Richard Neher.

Source code to Olmsted is made available under the terms of the [GNU Affero General Public License](LICENSE.txt) (AGPL). Olmsted is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.
