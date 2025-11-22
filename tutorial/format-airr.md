# AIRR (Adaptive Immune Receptor Repertoire) Format

## Overview

AIRR format is a JSON-based standard developed by the AIRR Community for representing adaptive immune receptor repertoire sequencing data, including B and T cell receptor sequences, clonal families, and phylogenetic relationships.

## File Structure

AIRR format uses a **single JSON file** containing all data in a nested structure.

## Top-Level Structure

```json
{
    "ident": "unique-dataset-id",
    "subjects": [...],
    "build": {...},
    "samples": [...],
    "seeds": [...],
    "clones": [...]
}
```

## Key Sections

### 1. Dataset Metadata

| Field | Description | Example |
|-------|-------------|---------|
| `ident` | Unique dataset identifier | `"c927cd38-6e0d-37c2-a5da-4f04131a12a5"` |
| `build` | Build information (commit, timestamp) | `{"id": "build-2020-01-30", ...}` |

### 2. Subjects

Array of subject/patient information:

```json
"subjects": [
    {
        "subject_id": "patient-001",
        "ident": "unique-subject-id"
    }
]
```

### 3. Samples

Array of sample metadata:

```json
"samples": [
    {
        "sample_id": "sample-001",
        "ident": "unique-sample-id",
        "locus": "igh",
        "timepoint_id": "100dayspostinfection",
        "partitions": [...]
    }
]
```

**Key fields:**
- `locus`: Immunoglobulin locus (`"igh"`, `"igk"`, `"igl"`, `"tra"`, `"trb"`)
- `timepoint_id`: Sampling timepoint identifier
- `partitions`: Clonal partitioning information (optional)

### 4. Clones (Most Important Section)

Array of clonal families with sequences and trees:

```json
"clones": [
    {
        "clone_id": "clust-3",
        "sample_id": "sample-001",
        "dataset_id": "dataset-2020.01.30",
        "v_call": "IGHV1-18*01",
        "j_call": "IGHJ4*02",
        "germline_alignment": "CAGGTTCAG...",
        "size": 46,
        "unique_seqs_count": 33,
        "total_read_count": 37,
        "rearrangement_count": 33,
        "junction_length": 51,
        "trees": [...]
    }
]
```

**Clone-level fields:**

| Field | Description | Required |
|-------|-------------|----------|
| `clone_id` | Unique clonal family identifier | Yes |
| `sample_id` | Sample identifier | Yes |
| `v_call` | V gene assignment | Yes |
| `j_call` | J gene assignment | Yes |
| `germline_alignment` | Germline/naive nucleotide sequence | Yes |
| `size` | Total number of sequences in clone | No |
| `unique_seqs_count` | Number of unique sequences | No |
| `junction_length` | Length of junction region | No |
| `trees` | Array of phylogenetic trees | Yes |

### 5. Trees

Each clone contains one or more phylogenetic trees:

```json
"trees": [
    {
        "tree_id": "min_adcl-raxml_ng",
        "ident": "unique-tree-id",
        "newick": "(((node1:0.008,node2:0.008)...)inferred_naive:0;",
        "downsampling_strategy": "min_adcl",
        "nodes": {
            "sequence-id-1": {
                "sequence_id": "sequence-id-1",
                "parent": "Node1",
                "sequence_alignment": "CAGGTTCAGCTG...",
                "sequence_alignment_aa": "QVQLVQSG...",
                "distance": 0.027509,
                "length": 0.01952,
                "multiplicity": 1,
                "type": "leaf",
                "timepoint_id": "100days",
                "affinity": 1.23e-9,
                "lbi": 0.00018123,
                "lbr": 0.0
            }
        }
    }
]
```

**Tree-level fields:**

| Field | Description |
|-------|-------------|
| `tree_id` | Tree identifier (method/algorithm) |
| `newick` | Newick format tree string |
| `nodes` | Dictionary of all nodes (sequences) in tree |

**Node-level fields:**

| Field | Description |
|-------|-------------|
| `sequence_id` | Unique sequence identifier |
| `parent` | Parent node ID (null for root) |
| `sequence_alignment` | Nucleotide sequence |
| `sequence_alignment_aa` | Amino acid sequence |
| `distance` | Cumulative distance from root |
| `length` | Branch length to parent |
| `multiplicity` | Sequence abundance |
| `type` | Node type (`"leaf"` or `"internal"`) |
| `timepoint_id` | Sampling timepoint |
| `affinity` | Binding affinity (optional) |
| `lbi` | Local Branching Index (optional) |
| `lbr` | Local Branching Ratio (optional) |

## Timepoint Multiplicities

Nodes can have timepoint-specific multiplicity data:

```json
"timepoint_multiplicities": [
    {
        "timepoint_id": "day0",
        "multiplicity": 5
    },
    {
        "timepoint_id": "day100",
        "multiplicity": 12
    }
]
```

This allows visualization of temporal dynamics within a lineage.

## Key Requirements

1. **Valid JSON**: File must be properly formatted JSON
2. **Sequence consistency**: All node IDs in `newick` must have corresponding entries in `nodes`
3. **Parent-child relationships**: Parent node IDs must exist in the nodes dictionary
4. **Nucleotide sequences**: `sequence_alignment` should be DNA sequences
5. **Amino acid sequences**: `sequence_alignment_aa` should match translated nucleotide sequence

## Example Processing Commands

### Auto-detection (Recommended)

```bash
olmsted process \
  -i full_schema_dataset.json \
  -o output.json \
  -n "My AIRR Dataset"
```

The format is auto-detected from the JSON structure.

### Explicit Format with Options

```bash
olmsted process \
  -i data.json \
  -f airr \
  -o output.json \
  --naive-name "inferred_naive" \
  --root-trees \
  --compute-metrics
```

**Options:**
- `--naive-name`: Specify the name used for naive/germline sequences (default: auto-detect)
- `--root-trees`: Re-root trees at the naive sequence
- `--compute-metrics`: Calculate LBI, LBR, and mutation frequency

## Sample Data Location

Example AIRR files are available in the olmsted-cli repository:
- `olmsted-cli/example_data/airr/full_schema_dataset.json`

## AIRR Standards Documentation

For complete AIRR schema documentation, see:
- AIRR Community standards: https://docs.airr-community.org/
- Olmsted schema reference: https://olmstedviz.org/schema.html

## Differences from PCP Format

| Feature | PCP | AIRR |
|---------|-----|------|
| File structure | 2 CSV files | 1 JSON file |
| Format type | Tabular | Nested JSON |
| Standardization | Custom | AIRR Community standard |
| Tree representation | Separate trees file | Embedded in clones |
| Metadata | Column-based | Flexible nested structure |
| Sequences | Parent-child pairs | Complete tree with all nodes |
