# Olmsted Video Tutorial - Shot List

---

# PART 1: WEB APPLICATION

## Shot 1.1: General Introduction (1-2 minutes)
**Purpose**: Overview of Olmsted and what viewers will learn

**Content**:
- What is Olmsted? (B cell lineage visualization tool)
- Who is it for? (Immunology researchers, bioinformaticians)
- What you'll learn in this tutorial:
  - Web application interface and features
  - Processing your own data with the CLI tool
- Three ways to access Olmsted:
  - **Public website**: https://olmstedviz.org (no installation required)
    - Public website is static. 
    - Can "upload" your own data using the public website.
    - Data is not actually uploaded, it is kept in a local client-side database.
  - **Docker deployment**: `docker run -p 8080:3999 quay.io/matsengrp/olmsted`
  - **Local development**: `npm start` or `./bin/olmsted-server-local.sh`
- Clarify that 

**Visual**: Show olmstedviz.org homepage

---

## Shot 1.2: Splash Page & Database Management (2-3 minutes)
**Purpose**: Learn to upload and manage datasets

**Content**:
- **Splash page overview**:
  - Available Datasets table
  - Color-coded status indicators (loaded, loading, error)

- **Uploading data**:
  - Method 1: "Upload Data" button (file explorer)
  - Method 2: Drag-and-drop functionality
  - Client-side processing (data stays in your browser)
  - IndexedDB persistence (datasets saved locally)

- **Managing datasets**:
  - Dataset selection checkboxes
  - Select multiple datasets for comparison
  - Dataset metadata display
  - Delete datasets (if needed)

- **Starting exploration**:
  - Must select ≥1 dataset
  - Click "Explore!" button to continue

**Visual**: Demo upload workflow, show multiple datasets

---

## Shot 1.3: Explore Page & Switching Data (1-2 minutes)
**Purpose**: Navigate between entry page and visualization, switch datasets dynamically

**Content**:
- **Two ways to access visualization**:
  - From splash page: Select datasets → "Explore!"
  - Direct navigation with URL parameters

- **Dataset management in explore view**:
  - Dataset table on visualization page
  - Selecting/deselecting datasets
  - "Update Visualization" button (apply changes)
  - "Manage Datasets" button (return to splash page)

- **Dynamic dataset switching**:
  - Add datasets without losing current view
  - Compare multiple datasets side-by-side
  - Changes load into query string (shareable URLs)

**Visual**: Switch between pages, toggle datasets on/off

---

## Shot 1.4: Scatterplot & Features (3-4 minutes)
**Purpose**: Explore clonal families using interactive scatterplot

**Content**:
- **Scatterplot overview**:
  - Each point = one clonal family
  - Default view: unique sequences vs. mutation frequency

- **Locus selection**:
  - Dropdown selector (default: IGH)
  - Choose "ALL" to see all loci
  - Filter by specific locus (IGH, IGK, IGL)

- **Axis configuration**:
  - X-axis: `unique_seqs_count` (default), customize to any field
  - Y-axis: `mean_mut_freq` (default), customize to any field
  - Show alternative mappings (affinity, LBI, tree size, etc.)

- **Visual customization**:
  - Point color mapping (by dataset, locus, custom field)
  - Point shape mapping
  - Point size scaling

- **Faceting**:
  - Split plot into panels by data field
  - Useful for multi-dataset comparison

- **Interactive selection**:
  - Click individual points to filter
  - Click and drag to select subset of points
  - Selected families appear in table below

- **Selected families table**:
  - Metadata columns
  - Recombination event visualization
  - Sort by any column
  - Select a family (checkbox) to view details

**Visual**: Click points, drag selection, change axes, show faceting

---

## Shot 1.5: Clonal Tree & Features (3-4 minutes)
**Purpose**: Visualize phylogenetic trees and explore clonal family evolution

**Content**:
- **Tree display basics**:
  - Phylogenetic tree of selected clonal family
  - Ancestral reconstruction method selector (if multiple available)
  - Automatic top family selection

- **Navigation**:
  - Scroll to zoom (hover over tree area)
  - Click and drag to pan
  - Reset view button

- **Alignment view**:
  - Side-by-side with tree
  - Color-coded amino acid mutations from root sequence
  - Vertical zoom synchronized with tree
  - Scrollable for large trees

- **Leaf node visualization**:
  - Pie chart representation (shows multiplicity)
  - Color-coded by sampling timepoint
  - Size reflects abundance

- **Tree configuration options** (below tree):
  - Tree/alignment width ratio slider
  - Field mapped to leaf size (multiplicity, affinity, etc.)
  - Maximum leaf size control
  - Tree tip labels toggle (show/hide)
  - Branch width mapping
  - Branch color mapping (by time, mutation count, LBI, etc.)

**Visual**: Zoom/pan tree, toggle options, show alignment sync

---

## Shot 1.6: Ancestral Sequence & Features (2 minutes)
**Purpose**: Drill down into individual lineages and view mutations

**Content**:
- **Accessing lineage view**:
  - Click on a leaf label (sequence name)
  - OR click on a leaf circle/pie chart

- **Lineage alignment display**:
  - Shows full ancestral path from naive → selected leaf
  - Each ancestor listed in order
  - Mutation highlighting from naive sequence
  - Color-coded changes (amino acid substitutions)

- **Understanding mutations**:
  - Mutations accumulate down the lineage
  - Compare any sequence to naive
  - Identify key mutation events

- **Navigation**:
  - Return to tree view
  - Select different leaf nodes

**Visual**: Click leaf, show lineage, highlight mutations

---

# PART 2: COMMAND-LINE INTERFACE (olmsted-cli)

## Shot 2.0: Transition

**Purpose:** Establish the role of the CLI toolchain

**Content:**

- We will now talk about how to prepare your data for use with Olmsted.  
- We are taking data in two popular file formats (AIRR and PCP).  
- These will be converted into a common olmsted-readable JSON format.    

## Shot 2.1: Install Guide (1-2 minutes)

**Purpose**: Set up olmsted-cli on your system

**Content**:
- **Prerequisites**:
  - Python 3.9 or higher required
  - Check version: `python --version`

- **Recommended installation (pipx)**:
  ```bash
  pipx install olmsted-cli
  ```
  - Benefits: Isolated environment, clean PATH management

- **Alternative installation (pip)**:
  ```bash
  pip install olmsted-cli
  ```

- **Optional: Conda environment** (best practice):
  ```bash
  conda create -n olmsted python=3.9
  conda activate olmsted
  pip install olmsted-cli
  ```

- **Verify installation**:
  ```bash
  olmsted --help
  ```
  - Show help output
  - List available commands

**Visual**: Terminal recording of installation process

---

## Shot 2.2: Process Command & Options (3-4 minutes)
**Purpose**: Convert your data to Olmsted format

**Content**:
- **Navigate to example data**:
  ```bash
  cd olmsted-cli/example_data/
  ```

- **Basic PCP processing**:
  ```bash
  olmsted process -i pcp/pcp.csv -t pcp/trees.csv -o output.json -f pcp -n "My Dataset"
  ```
  - `-i`: Input data file
  - `-t`: Trees file (PCP format only)
  - `-o`: Output JSON file
  - `-f`: Format (pcp or airr)
  - `-n`: Dataset name

- **Basic AIRR processing** (auto-detection):
  ```bash
  olmsted process -i airr/full_schema_dataset.json -o output.json -n "My AIRR Data"
  ```
  - Format auto-detected from file structure

- **Advanced processing with metrics**:
  ```bash
  olmsted process -i pcp/pcp.csv -t pcp/trees.csv -o output.json --compute-metrics --lbi-tau 0.0125
  ```
  - `--compute-metrics`: Calculate LBI, LBR, mutation frequency
  - `--lbi-tau`: Tau parameter for LBI calculation

- **AIRR-specific options**:
  ```bash
  olmsted process -i data.json -f airr -o output.json --naive-name "naive"
  ```
  - `--naive-name`: Specify naive sequence identifier
  
- **Verbosity control**:
  ```bash
  olmsted process -i data.csv -o output.json -v 2
  ```
  - `-v 0`: Quiet (errors only)
  - `-v 1`: Normal (default)
  - `-v 2`: Verbose (detailed progress)
  - `-v 3`: Debug (maximum detail)

- **Show output file structure**: Open generated JSON

**Visual**: Run each command, show output, explain options

---

## Shot 2.3: Other Commands & Options (2-3 minutes)
**Purpose**: Validation, summary stats, and file management

**Content**:
- **Validation during processing**:
  ```bash
  olmsted process -i data.csv -t trees.csv -o output.json --validate
  ```
  - `--validate`: Check output against schema
  - `--strict-validation`: Fail on any warnings

- **Standalone validation**:
  ```bash
  olmsted validate output.json
  ```
  - Verify existing files
  - Detailed error reporting

- **Verbose validation**:
  ```bash
  olmsted validate -v --strict output.json
  ```

- **Summary statistics**:
  ```bash
  olmsted summary output.json
  ```
  - Display dataset overview
  - Count clones, sequences, metadata fields

- **JSON summary output**:
  ```bash
  olmsted summary --json output.json -o summary.json
  ```
  - Machine-readable statistics


**Visual**: Run commands, show validation errors/success, display summary

---

## Shot 2.4: Input & Output Formats Explained (2-3 minutes)
**Purpose**: Understand data formats and requirements

**Content**:
- **Olmsted JSON output format**:
  - Final format used by web app
  - Schema available at olmstedviz.org/schema.html
  - Contains: clonal families, trees, sequences, metadata

- **PCP (Parent-Child Pair) Format**:
  - **Two-file structure**: Main CSV + Trees CSV
  - Show example from `olmsted-cli/example_data/pcp/`
  - Key columns: `sample_id`, `family`, `parent_name`, `child_name`, sequences, V/J genes
  - Newick trees in separate file
  - **Reference**: See `tutorial/format-pcp.md` for full specification

- **AIRR (Adaptive Immune Receptor Repertoire) Format**:
  - **Single JSON file** following AIRR Community standards
  - Show example from `olmsted-cli/example_data/airr/`
  - Nested structure: samples → clones → trees → nodes
  - Includes metadata, sequences, multiplicities, metrics
  - **Reference**: See `tutorial/format-airr.md` for full specification

- **Uploading to web app**:
  - Only the **Olmsted JSON output** is uploaded
  - Return to web interface
  - Drag-and-drop processed JSON
  - Verify visualization works

**Visual**: Show file examples, highlight key differences, demo upload

**Documentation**:
- Detailed format specs: `tutorial/format-pcp.md` and `tutorial/format-airr.md`
- AIRR standards: https://docs.airr-community.org/
- Olmsted schema: https://olmstedviz.org/schema.html

---

## Closing (1 minute)
**Purpose**: Resources and next steps

**Content**:
- Where to get help:
  - Documentation: olmstedviz.org
  - GitHub issues: github.com/matsengrp/olmsted
  - Schema reference: olmstedviz.org/schema.html

- Example datasets available in `olmsted-cli/example_data/`

- Encouragement to explore with own data

**Visual**: Show resource links

---

## Total Estimated Length
**Part 1 (Web App)**: 12-17 minutes
**Part 2 (CLI)**: 8-12 minutes
**Total**: 20-29 minutes (target: ~25 minutes)

