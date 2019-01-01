
# Olmsted

![tree logo](src/images/olmsted.svg)

*After [Fredrick Law Olmsted](https://en.wikipedia.org/wiki/Frederick_Law_Olmsted), a tree-hugger considered the father of Landscape architecture*



## Introduction

Olmsted is an open-source tool for visualizing and exploring the adaptive immune system.

B-cells code for and generate _antibodies_, proteins which stick to some exposed structure (_antigen_) on a virus or bacteria.
Recently, it has become possible to deep sequence B-cell receptor genes (millions of sequences per sample in some cases), giving us an in depth snapshot of the adaptive immune system at a point in time.

Olmsted combines powerful interactive data visualizations as part of an explorer flow in which repertoires can be explored in depth, unlocking a birds eye view of this data.


## The explorer view

The explorer view breaks down into a hierarchy of components which allow one drill down into details of the data.

### Datasets page

When you first hit the application at it's root address, you'll be presented with a page where you can select data for exploration.

![splash](docs/spash.png)

Once selected, hitting "Explore" takes you to a page which encodes for the selected datasets:

<http://olmsted-deploy.s3-website-us-west-2.amazonaws.com/app?selectedDatasets=bf520-synth-v17-2018.12.21&selectedDatasets=kate-qrs-v17-2018.12.21&selectedDatasets=mg505-synth-v17-2018.12.21>

### Clonal family scatterplot

The top level component in the explorer view is a scatterplot of all the clonal families in your selected datasets.
The axes, color and symbol mappings are all customizable.

![scatterplot](docs/scatterplot-viz.png)

It's also possible to facet the visualization by a variable, which splits it up into separate panes, one for each value corresponding to the selected variable.
For example, we might want to facet by subject to get a better sense of how trends compare between subjects

![facet](docs/facet.png)

### Clonal family table

In the main clonal family scatterplot, you can click and drag to select a set of points in the plot.
When you do, the selection acts as a filter for the clonal families table.

This table shows additional details about the selected clonal families, including a visual encoding of the gene rearrangement responsible for the clonal family's naive B-cell.
You can also click on a column header of the table to sort by that column.

![tree align view](docs/clonal-families-table2.png)

### Tree and alignment view

Clicking on a row of the table presents further details about the clonal family, including a phylogenetic tree of select sequences from the family, and a visualization of the mutation patterns in the selected sequences.
As with other visualizations in the application, the details of color and node size can be controlled.

![tree align view](docs/tree-align-view.png)

### Lineage view

Clicking on a tip in the phylogenetic tree displays additional details about the series of mutations leading up to the sequence in question.

![lineage view](docs/lineage-view.png)



## Data processing - Partis & CFT

Olmsted requires that you run your B-cell repertoire data through [Partis](https://github.com/psathyrella/partis), followed by the [CFT](https://github.com/matsengrp/cft) pipeline (let us know if this won't work for you for some reason).

Partis takes your raw B-cell data, sorts it into _clonal families_ of related sequences, and infers for each such family the _naive_ B-cell sequence from which that family evolved.
CFT then takes those clonal families and builds phylogenetic trees for them (hence the name), as well as ancestral state reconstructions so that you can see how each sequence evolved from its clonal family's naive sequence.

The process for getting data out of CFT and into Olmsted now is a script in `cft/bin/build_olmsted_data.py`, which takes the JSON files output by CFT and extracts several data files at the paths you specify.
Olmsted will read in the files you specify at `olmsted/data/{datasets,clonal_families}.csv`.
This flow will likely eventually be improved, but for now let us know if you'd like help getting your data into Olmsted.


## Install

To install Olmsted, clone the git repository

```
git clone https://github.com/matsengrp/olmsted.git
cd olmsted
```

You'll need Node.js to run Olmsted.
You can check if node is installed with `node --version`.
With Node.js present you can install olmsted with

```
npm install
# or, if this fails due to permissions issues
sudo npm install
```

You may also need to install libcairo

```
sudo apt-get install libcairo2 libcairo2-dev
```

You can then run Olmsted locally with `npm start localData`, and open a browser to [http://localhost:4000](http://localhost:4000/).


## Implementation notes

This application relies on React.js and Redux for basic framework, and Vega and Vega-Lite for the interactive data visualizations.


## Build Electron App

_Have no idea if this still works._

```
npm install -g electron-builder
npm run dist:electron
```

## License and copyright

Copyright 2018 Christopher Small and Erick Matsen 
forked from Auspice Copyright 2014-2018 Trevor Bedford and Richard Neher.

Source code to Olmsted is made available under the terms of the [GNU Affero General Public License](LICENSE.txt) (AGPL). Olmsted is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.


