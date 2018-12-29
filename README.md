
*After [Fredrick Law Olmsted](https://en.wikipedia.org/wiki/Frederick_Law_Olmsted), a tree-hugger considered the father of Landscape architecture*


## Introduction

Olmsted is an open-source tool for visualizing and exploring the adaptive immune system.

B-cells code for and generate _antibodies_, proteins which stick to some exposed structure (_antigen_) on an infectious agent, such as viruses or bacteria.
Within the last several years, it has become possible to deep sequence B-cell receptor genes (millions of sequences per sample in some cases), giving us for the first time the ability to get a "birds eye view" of the adaptive immune system at a point in time.

Olmsted combines powerful interactive data visualizations as part of an explorer flow in which repertoires can be explored at multiple levels of detail.


## Data processing - Partis & CFT

Olmsted requires that you run your B-cell repertoire data through [Partis](https://github.com/psathyrella/partis), followed by the [CFT](https://github.com/matsengrp/cft) pipeline (let us know if this won't work for you for some reason).

Partis takes your raw B-cell data, sorts it into _clonal families_ of related sequences, and infers for each such family the _naive_ B-cell sequence from which that family evolved.
CFT then takes those clonal families and builds phylogenetic trees for them (hence the name), as well as ancestral state reconstructions so that you can see how each sequence evolved from its clonal family's naive sequence.

The process for getting data out of CFT and into Olmsted now is a script in `cft/bin/build_olmsted_data.py`, which takes the JSON files output by CFT and extracts several data files at the paths you specify.
Olmsted will read in the files you specify at `olmsted/data/{datasets,clonal_families}.csv`.
This flow will likely eventually be improved, but for now its what we got.


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


## The explorer view

The top pane below is a high level scatterplot view of all the loaded clonal families.
The axes are customizable, as is the color/symbol scheme.
As you brush select a set of points in the plot, the selection acts as a filter on the table below.

![image](https://user-images.githubusercontent.com/88556/44306337-593a6100-a341-11e8-864d-6cbd75dfb804.png)

Clicking on a row of the table presents further details about the clonal family, including a phylogenetic tree of select sequences from the family, and a visualization of the mutation patterns in the selected sequences.
All these plots will be highly configurable and interactive, and in particular, it will be possible to view the ancestral state reconstructions of the sequences at the internal nodes of the tree.


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


