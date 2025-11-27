# Olmsted Video Trailer - Detailed Outline

**Target Length**: 120 seconds (2 minutes)
**Tone**: Professional, technical, academic
**Audience**: Immunology researchers, bioinformaticians, computational biologists
**Goal**: Demonstrate Olmsted's technical capabilities for B cell lineage analysis

---

## Opening (0:00-0:15, ~15 seconds)

**Visual**:
- Clean title card: "Olmsted" with subtitle "B Cell Lineage Visualization"
- Fade to Olmsted interface showing scatterplot with real data
- Steady, professional camera movement (no rapid cuts)
- Show scale indicator: "15,847 clonal families"

**Narration**:
> "Olmsted is a browser-based tool for interactive exploration of B cell receptor repertoire sequencing data and clonal lineage trees."

**On-Screen Text**:
- "OLMSTED"
- "Matsen Group - Fred Hutchinson Cancer Center"

**Music**:
- Minimal, professional ambient background (optional, or no music)

---

## Platform Overview (0:15-0:30, ~15 seconds)

**Visual**:
- Browser window showing olmstedviz.org
- Address bar clearly visible
- Clean interface load (real-time, not sped up)
- Show splash page with example datasets listed

**Narration**:
> "The web application requires no installation and runs entirely in the browser. Data processing is performed client-side, with local IndexedDB persistence."

**On-Screen Text**:
- "Browser-based application"
- "Client-side processing"
- "olmstedviz.org"

---

## Data Loading (0:30-0:45, ~15 seconds)

**Visual**:
- Mouse cursor drags JSON file onto browser window
- Upload progress indicator appears
- File loads into local database
- Dataset appears in table with metadata (name, number of clones, locus)
- Click "Explore" button to enter visualization interface

**Narration**:
> "Data files are loaded directly into the browser. Supported formats include AIRR-compliant JSON and PCP CSV, with conversion tools available for data preparation."

**On-Screen Text**:
- "Drag and drop data files"
- "Supports AIRR and PCP formats"

**Technical Detail**:
- Show actual file size being loaded (e.g., "Loading: 15.2 MB")

---

## Repertoire-Level View (0:45-1:00, ~15 seconds)

**Visual**:
- Scatterplot displaying clonal families
- Axes labeled: "Unique sequences" (X) and "Mean mutation frequency" (Y)
- Points color-coded by immunoglobulin locus (IGH, IGK, IGL)
- Show locus filter dropdown being used
- Demonstrate click-drag selection to highlight subset of families
- Selected families appear in table below plot

**Narration**:
> "The scatterplot provides a repertoire-wide overview. Each point represents a clonal family. Axis mappings, color encoding, and faceting are configurable for exploratory analysis."

**On-Screen Text**:
- "15,847 clonal families"
- "Configurable axis mappings"

**Technical Detail**:
- Show actual axis labels and legend clearly visible

---

## Clonal Tree View (1:00-1:15, ~15 seconds)

**Visual**:
- Transition from scatterplot to phylogenetic tree view
- Show full tree with branch structure visible
- Leaf nodes displayed as pie charts showing timepoint multiplicities
- Alignment panel visible alongside tree
- Demonstrate zoom and pan functionality (smooth, controlled movements)
- Show tree configuration controls: branch color mapping, leaf size mapping

**Narration**:
> "Individual clonal families are displayed as phylogenetic trees with aligned sequences. Branch properties can be mapped to computed metrics including LBI, mutation count, or timepoint. Leaf nodes show multiplicity data."

**On-Screen Text**:
- "Interactive phylogenetic trees"
- "Synchronized alignment view"

**Technical Detail**:
- Show specific tree with node count (e.g., "46 sequences")

---

## Lineage Detail View (1:15-1:30, ~15 seconds)

**Visual**:
- Click on a leaf node in the tree
- Transition to lineage view showing ancestral sequence path
- Display shows: naive → intermediate ancestors → selected leaf
- Amino acid sequences aligned with color-coded mutations
- Mutations highlighted at each evolutionary step
- Show mutation positions relative to CDR regions (if available)

**Narration**:
> "Selecting a sequence displays its full ancestral lineage from the germline sequence. Amino acid mutations are highlighted, enabling detailed analysis of somatic hypermutation patterns."

**On-Screen Text**:
- "Ancestral lineage reconstruction"
- "Somatic hypermutation analysis"

**Technical Detail**:
- Show sequence IDs and mutation annotations clearly

---

## Technical Features (1:30-1:45, ~15 seconds)

**Visual**:
- Return to interface showing multiple datasets loaded
- Demonstrate dataset switching (checkbox selection)
- Show "Update Visualization" workflow
- Display computed metrics in tooltip (LBI, LBR values with scientific notation)
- Show example of multi-dataset comparison in faceted view

**Narration**:
> "Additional features include multi-dataset comparison, computed phylogenetic metrics such as local branching index, and persistent client-side storage using IndexedDB."

**On-Screen Text**:
- "Multi-dataset support"
- "Computed metrics: LBI, LBR, mutation frequency"

**Technical Detail**:
- Show actual metric values in tooltips

---

## Access and Resources (1:45-2:00, ~15 seconds)

**Visual**:
- Clean screen showing olmstedviz.org in browser
- Show GitHub repository page briefly
- Display schema documentation page

**Narration**:
> "Olmsted is available at olmstedviz.org. The tool is open source. Complete documentation and example datasets are available via GitHub."

**On-Screen Text**:
- "olmstedviz.org"
- "github.com/matsengrp/olmsted"

**Technical Detail**:
- Show actual URLs clearly visible

---

## Closing (2:00-2:15, ~15 seconds)

**Visual**:
- Static title card with clean typography
- Olmsted logo
- Institutional affiliation
- URL and contact information displayed clearly
- Optional: Subtle tree visualization in background (non-animated)

**On-Screen Text**:
- "OLMSTED"
- "B Cell Lineage Visualization"
- "Matsen Group"
- "Fred Hutchinson Cancer Center"
- "olmstedviz.org"
- "github.com/matsengrp/olmsted"

**Narration**:
> "Olmsted: B cell lineage visualization. Developed by the Matsen Group at Fred Hutchinson Cancer Center."

**Music**:
- Fade out (if music was used)

---

## Technical Production Notes

### Pacing
- Measured, deliberate pace - avoid rapid cuts
- Allow 2-3 seconds for technical details to be readable on screen
- Transitions should be smooth and professional (simple fades or direct cuts)
- Real-time demonstrations preferred over sped-up footage

### Narration Style
- Technical and precise language
- Clear pronunciation of scientific terms (immunoglobulin, somatic hypermutation, etc.)
- Neutral, informative tone - focus on capabilities, not selling
- Voice should be authoritative but not promotional
- Appropriate for academic conference presentations

### Visual Guidelines
- Use actual Olmsted interface exclusively (no mockups or diagrams)
- Screen recordings at minimum 1080p resolution
- Ensure all text is legible (interface elements, code, data values)
- Maintain consistent browser window size throughout
- Show actual URLs, file paths, and command syntax clearly
- Use real scientific data (not synthetic or randomized data)

### Data Selection
- Choose dataset with biological relevance (e.g., actual vaccine study or antibody lineage)
- Select clonal family with clear phylogenetic structure (15-50 sequences ideal)
- Ensure visible somatic hypermutation patterns in lineage view
- Use data with timepoint information for pie chart demonstrations
- Verify computed metrics (LBI, LBR) are present in data

### On-Screen Text
- Use clean, professional sans-serif font
- High contrast (white text on dark background or vice versa)
- Text size: minimum 24pt for readability
- Keep text concise and technical
- Avoid exclamation points or marketing language

### Audio
- Minimal or no background music (scientific presentation style)
- If music used: subtle, non-intrusive ambient track
- Ensure narration is clearly audible above any background audio
- Professional voice recording quality (no echo, clear enunciation)

### Accessibility
- Include accurate closed captions for all narration
- Ensure sufficient color contrast for color-blind viewers
- Describe on-screen actions verbally (e.g., "clicking on a leaf node")
- Make technical details visible for sufficient duration

### Code and Terminal Display
- Use monospace font for all code/commands
- Syntax highlighting if possible
- Show full commands without truncation
- Display actual command output (not simulated)
- Include any relevant warnings or status messages

---

## Key Technical Points to Emphasize

### 1. Client-Side Architecture
- No server-side processing or data upload
- All computation in browser
- IndexedDB for local persistence
- Privacy preservation

### 2. Format Interoperability
- AIRR Community standard support
- PCP (parent-child pair) format support
- Conversion tools available for data preparation

### 3. Multi-Scale Navigation
- Repertoire-level overview (thousands of families)
- Family-level phylogenetic trees (tens to hundreds of sequences)
- Sequence-level lineage detail (individual mutations)
- Seamless transitions between scales

### 4. Accessibility
- Browser-based (no installation barrier)
- Public instance available (olmstedviz.org)
- Open source (community contribution possible)

---

## Avoided Elements

### Do NOT Include:
- Marketing hyperbole or superlatives ("amazing", "revolutionary", "best")
- Comparisons to other tools or competitor criticism
- Testimonials or user quotes
- Dramatic music or sound effects
- Emotional appeals or storytelling
- Abstract animations or metaphorical graphics
- Stock footage of researchers/labs
- Rapid jump cuts or "MTV-style" editing

### Instead Focus On:
- Direct demonstration of features
- Technical accuracy
- Clear, factual narration
- Real software interface and real data
- Measured, professional presentation

---

**Total Runtime**: 2:00-2:15 (approximately 120-135 seconds)
