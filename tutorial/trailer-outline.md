# Olmsted Video Trailer - Detailed Outline

**Target Length**: 120 seconds (2 minutes)

---

## 1.1 Opening (0:00-0:15, ~15 seconds)

**Visual**:
- Clean title card: "Olmsted" with subtitle "B Cell Lineage Visualization"
- Fade to Olmsted interface showing scatterplot with data

**Narration**:
> "Olmsted is a browser-based tool for interactive exploration and visualization of B cell receptor repertoires and clonal family trees."

---

## 1.2 Platform Overview (0:15-0:30, ~15 seconds)

**Visual**:
- Browser window showing olmstedviz.org
- Address bar clearly visible
- Show splash page with example datasets listed

**Narration**:
> "The web application requires no installation and runs entirely in the browser. Data processing is performed client-side, with local persistence."

---

## 1.3 Data Loading (0:30-0:45, ~15 seconds)

**Visual**:
- Mouse cursor drags JSON file onto browser window
- Upload progress indicator appears
- File loads into local database
- Dataset appears in table with metadata (name, number of clones, locus)
- Click "Explore" button to enter visualization interface

**Narration**:

> "Data files are loaded directly into the browser. Supported formats include AIRR-compliant JSON and in-house PCP CSV, with conversion tools available for data preparation."

---

## 1.4 Repertoire-Level View (0:45-1:00, ~15 seconds)

**Visual**:
- Scatterplot displaying clonal families
- Axes labeled: "Unique sequences" (X) and "Mean mutation frequency" (Y)
- Points color-coded by immunoglobulin locus (IGH, IGK, IGL)
- Show locus filter dropdown being used
- Demonstrate click-drag selection to highlight subset of families
- Selected families appear in table below plot

**Narration**:
> "The scatterplot provides a repertoire-wide overview. Each point represents a clonal family. Axis mappings, color encoding, and faceting are configurable for exploratory analysis."

---

## 1.5 Clonal Tree View (1:00-1:15, ~15 seconds)

**Visual**:
- Transition from scatterplot to phylogenetic tree view
- Show full tree with branch structure visible
- Leaf nodes displayed as pie charts showing timepoint multiplicities
- Alignment panel visible alongside tree
- Demonstrate zoom and pan functionality (smooth, controlled movements)
- Show tree configuration controls: branch color mapping, leaf size mapping

**Narration**:
> "Individual clonal families are displayed as phylogenetic trees with aligned sequences. Branch properties can be mapped to computed metrics including LBI,  LBR, and mutation counts. Leaf node sizes can represent multiplicity or affinity data."

---

## 1.6 Lineage Detail View (1:15-1:30, ~15 seconds)

**Visual**:
- Click on a leaf node in the tree
- Transition to lineage view showing ancestral sequence path
- Display shows: naive → intermediate ancestors → selected leaf
- Amino acid sequences aligned with color-coded mutations
- Mutations highlighted at each evolutionary step
- Show mutation positions relative to CDR regions (if available)

**Narration**:
> "Selecting a sequence displays its complete ancestral lineage from the germline sequence. Positional mutations are highlighted, enabling for detailed analysis of  patterns."

---

## 2.1 Technical Features (1:30-1:45, ~15 seconds)

**Visual**:
- Return to interface showing multiple datasets loaded
- Demonstrate dataset switching (checkbox selection)
- Show "Update Visualization" workflow
- Display computed metrics in tooltip (LBI, LBR values with scientific notation)
- Show example of multi-dataset comparison in faceted view

**Narration**:
> "Additional features include multi-dataset comparison, computed phylogenetic metrics such as local branching index, and persistent client-side storage."

---

## 2.2 Access and Resources (1:45-2:00, ~15 seconds)

**Visual**:
- Clean screen showing olmstedviz.org in browser
- Show GitHub repository page briefly
- Display schema documentation page

**Narration**:
> "Olmsted is available at olmstedviz.org. The tool is open source. Complete documentation and example datasets are available via GitHub."

---

## 2.3 Closing (2:00-2:15, ~15 seconds)

**Visual**:
- Static title card with clean typography
- Olmsted logo
- Institutional affiliation
- URL and contact information displayed clearly

**Narration**:

> "Olmsted: B cell lineage visualization tool. Developed by the Matsen Group at Fred Hutchinson Cancer Center."
