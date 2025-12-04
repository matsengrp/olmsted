# PCP (Parent-Child Pair) Format

## Overview

PCP format is a CSV-based format for representing B cell clonal lineages with explicit parent-child relationships and phylogenetic trees.

## Required Files

PCP format consists of **two CSV files**:

1. **Main data file** (`pcp.csv`) - Contains sequences and metadata
2. **Trees file** (`trees.csv`) - Contains Newick phylogenetic trees

## Main Data File Structure

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `sample_id` | Dataset identifier | `sample-igg-1008` |
| `family` | Clonal family ID | `3249` |
| `parent_name` | Parent sequence name | `naive` or `Node1` |
| `parent_heavy` | Parent heavy chain nucleotide sequence | `GAGGTGCAGCTG...` |
| `child_name` | Child sequence name | `Node1` or `1TTGGG...` |
| `child_heavy` | Child heavy chain nucleotide sequence | `GAGGTGCAGCTG...` |
| `branch_length` | Phylogenetic branch length | `7.78e-08` |
| `depth` | Depth in tree from root | `1`, `2`, `3`, etc. |
| `distance` | Cumulative distance from root | `7.78e-08` |
| `v_gene_heavy` | V gene assignment | `IGHV3-48*01` |
| `j_gene_heavy` | J gene assignment | `IGHJ4*02` |
| `cdr1_codon_start_heavy` | CDR1 start position (codon) | `75` |
| `cdr1_codon_end_heavy` | CDR1 end position (codon) | `96` |
| `cdr2_codon_start_heavy` | CDR2 start position (codon) | `150` |
| `cdr2_codon_end_heavy` | CDR2 end position (codon) | `171` |
| `cdr3_codon_start_heavy` | CDR3 start position (codon) | `288` |
| `cdr3_codon_end_heavy` | CDR3 end position (codon) | `348` |
| `parent_is_naive` | Is parent the naive sequence? | `True` or `False` |
| `child_is_leaf` | Is child a leaf node? | `True` or `False` |

### Optional Metadata Columns

You can add any additional columns for custom metadata:
- `timepoint` - Sampling timepoint
- `affinity` - Binding affinity measurements
- `multiplicity` - Sequence abundance
- Any other experimental or clinical data

### Example Row

```csv
0,sample-igg-1008,3249,naive,GAGGTGCAGCTG...,Node1,GAGGTGCAGCTG...,7.78e-08,1,7.78e-08,IGHV3-48*01,IGHJ4*02,75,96,150,171,288,348,True,False
```

## Trees File Structure

### Required Columns

| Column | Description | Example |
|--------|-------------|---------|
| `family_name` | Clonal family ID (matches `family` in main file) | `3249` |
| `sample_id` | Dataset identifier (matches main file) | `sample-igg-1008` |
| `newick_tree` | Newick format phylogenetic tree string | `(naive:0.00007...` |

### Example Row

```csv
3249,sample-igg-1008,"(naive:0.0000000778,((1TTGGGTTCTTTTCGATCTTGGG:0.0000000778,...)Node1;"
```

## Newick Tree Format

The Newick tree string must:
- Start with the root (usually `naive`)
- Include all node names that appear in the main data file
- Use proper Newick syntax: `(child1:length1,child2:length2)parent:length`
- End with a semicolon

## Key Requirements

1. **Sequence names must match**: All `parent_name` and `child_name` values in the main file must appear in the Newick tree
2. **Naive sequence**: The root is typically named `naive` and represents the germline/unmutated sequence
3. **Consistent identifiers**: `sample_id` and `family` must match between both files
4. **Nucleotide sequences**: Sequences should be nucleotide (DNA) sequences, not amino acids
5. **One row per edge**: Each parent-child relationship is a separate row in the main file

## Example Processing Command

```bash
olmsted process \
  -i pcp.csv \
  -t trees.csv \
  -o output.json \
  -f pcp \
  -n "My PCP Dataset"
```

## Sample Data Location

Example PCP files are available in the olmsted-cli repository:
- `olmsted-cli/example_data/pcp/pcp.csv`
- `olmsted-cli/example_data/pcp/trees.csv`
