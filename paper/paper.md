---
title: 'Olmsted: Rich Interactive Visualization of B Cell Lineages'
tags:
  - JavaScript
  - immunology
  - B cell receptor
  - phylogenetics
  - visualization
  - antibody
authors:
  - name: David H. Rich
    orcid: 0009-0005-2501-4032
    affiliation: 1
  - name: Elias Harkins
    orcid: 0000-0001-6525-9134
    affiliation: 1
  - name: Christopher T. Small
    affiliation: 1
  - name: Kevin Sung
    orcid: 0000-0002-7289-845X
    affiliation: 1
  - name: Laura Doepker
    orcid: 0000-0003-4514-5003
    affiliation: 2
  - name: Duncan Ralph
    orcid: 0000-0002-2527-8610
    affiliation: 1
  - name: Amrit Dhar
    orcid: 0000-0003-4573-596X
    affiliation: 1
  - name: Mackenzie S. Kopp
    orcid: 0000-0002-7436-5622
    affiliation: 2
  - name: Julie Overbaugh
    orcid: 0000-0002-0239-9444
    affiliation: 2
  - name: Frederick A. Matsen IV
    orcid: 0000-0003-0607-6025
    corresponding: true
    affiliation: 1
affiliations:
  - name: Computational Biology Program, Fred Hutchinson Cancer Center, Seattle, WA, USA
    index: 1
  - name: Human Biology Division, Fred Hutchinson Cancer Center, Seattle, WA, USA
    index: 2
date: 4 December 2025
bibliography: paper.bib
---

# Summary

Olmsted is an open-source, browser-based application for visually exploring B cell repertoires and clonal family tree data.
In the human immune system, affinity maturation of B cell receptor sequences coding for immunoglobulins (antibodies) begins with a diverse pool of randomly generated naive sequences and leads to a collection of evolutionary histories.
High-throughput DNA sequencing of the B cell repertoire, combined with computational reconstruction of these evolutionary histories, produces large collections of clonal families and their associated phylogenetic trees.
Olmsted enables researchers to scan across collections of clonal families using summary statistics, then interactively explore individual families to visualize phylogenies and amino acid mutations that occurred during affinity maturation.

# Statement of Need

Researchers studying B cell responses increasingly rely on high-throughput sequencing to characterize antibody repertoires.
Computational tools can reconstruct the evolutionary histories of these sequences, resulting in large collections of clonal families---groups of sequences descended from a common naive ancestor---and phylogenetic trees describing their diversification.
However, researchers often lack tools to explore these reconstructions in the detail necessary to choose sequences for functional, structural, or biochemical studies.

Existing visualization tools address different analytical goals.
AncesTree [@Foglierini2020-am] provides detailed single-tree exploration with amino acid mutation display, but requires Java installation, processes one lineage at a time without a repertoire overview, and handles heavy or light chains separately rather than as pairs.
ViCloD [@Jeusset2023-ow] focuses on large-scale intraclonal diversity analysis across hundreds of thousands of sequences, primarily for characterizing B cell tumors; it analyzes heavy chains only.
AIRRscape [@Waltari2022-bz] enables comparison across multiple repertoires to identify convergent antibody responses at the population level; it also visualizes heavy chains only.
ImmuneDB [@Rosenfeld2016-mj] presents collections in paginated list form for database-style querying.

Olmsted combines repertoire-level overview with detailed lineage exploration: researchers can scan across all clonal families in a scatterplot, then drill down to examine phylogenetic trees with aligned amino acid sequences showing mutations from the naive ancestor.
This multi-scale navigation, delivered through a zero-installation web application that keeps data client-side, supports practical decisions about which sequences to prioritize for downstream experimental studies.
Specifically, Olmsted allows users to:

- View all clonal families simultaneously in a configurable scatterplot
- Filter and select families based on biological criteria (mutation frequency, sequence count, V/J gene usage)
- Examine phylogenetic trees with aligned sequences showing mutations from the naive ancestor
- Trace the mutational history of individual sequences back to their germline origin
- Visualize paired heavy and light chain sequences together, which is essential for selecting antibodies for expression

Olmsted requires no installation---users simply visit [olmstedviz.org](http://olmstedviz.org) and upload their data directly in the browser.
Data processing is handled by a companion command-line tool, [olmsted-cli](https://github.com/matsengrp/olmsted-cli), which converts common immunoinformatics formats into Olmsted's input format.

# Features

## Client-Side Data Management

Olmsted requires no installation, account creation, or data upload to external servers.
Users simply visit [olmstedviz.org](http://olmstedviz.org) and load data via drag-and-drop or file browser.
All processing occurs client-side using browser-based storage (IndexedDB), ensuring that sensitive patient data never leaves the researcher's machine.
Datasets persist across browser sessions, combining the convenience of a web application with the privacy of local software.

## Data Preparation with olmsted-cli

The [olmsted-cli](https://github.com/matsengrp/olmsted-cli) command-line tool converts data into Olmsted's JSON format.
It supports two input formats:

- **AIRR format**: The JSON-based standard developed by the Adaptive Immune Receptor Repertoire Community [@Rubelt2017-vv; @Vander_Heiden2018-mu; @AIRR-Schema]. The AIRR lineage tree schema remains experimental and is evolving; we are not aware of any tools currently producing output in the newer schema versions, but are committed to supporting them as they become formalized.
- **PCP (Parent-Child Pair) format**: A CSV-based format with explicit parent-child relationships

Example usage:
```bash
olmsted process -i data.json -o output.json -n "My Dataset"
```
Once this data preparation is done once it creates a file that can be shared with collaborators who can use the web interface only.

## Interactive Visualization

The visualization interface consists of four linked sections:

1. **Clonal Families Scatterplot**: Each clonal family appears as a point, with configurable axes, colors, and faceting. Users can brush-select regions or click individual points.

2. **Selected Clonal Families Table**: Displays metadata for selected families, including V/J gene assignments and a visual representation of the recombination event.

3. **Clonal Family Tree**: Shows the phylogenetic tree alongside a sequence alignment. Colors indicate amino acid mutations relative to the naive sequence. The tree supports zooming and panning.

4. **Ancestral Sequences**: For a selected leaf, displays the complete mutational path from the naive sequence.

# Implementation

Olmsted is built with React and Redux, with visualizations implemented in Vega and Vega-Lite.
The codebase originated as a fork of Nextstrain's Auspice [@Hadfield2018-nextstrain].
The application can be deployed as a static single-page application or run locally via Docker.

# Acknowledgements

We thank Trevor Bedford, James Hadfield, and other authors of Nextstrain, on which Olmsted's source code is based.
We are grateful to the AIRR data representation working group for their cooperative development of the AIRR lineage schema.
This work was supported by National Institutes of Health grants R01 AI146028, R01 GM113246, R01 AI120961, R01 AI138709, U19 AI117891, and U19 AI128914, and by the Howard Hughes Medical Institute.

# References
