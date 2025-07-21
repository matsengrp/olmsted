# Parent-child pairs of BCR sequences

## Processing
Sequences are aligned to the start of the V gene. Sites at the 5' end with missing reads are padded with `N`. For productive sequences, the sequence length is restricted to a multiple of 3, truncating nucleotides at the 3' end if necessary. Edges containing stop codons that arise from ASR are removed.

## File name format
PCP file names have the following convention:

`<dataset name>-<non-standard pre-IQ-TREE filters>_<chain type>_<PCP type>_<date stamp>_<PCP filters>.csv.gz`

- non-standard pre-IQ-TREE filters (see below)
- chain type
    - `igh/k/l`: single chain type processing
    - `paired-igh/k/l`: paired-chain IQ-TREE processing, single chain type PCP
    - `paired-merged`: paired-chain IQ-TREE processing and PCP
- PCP type
    - `pcp`: PCPs from CFs of size at least 2
    - `CF1_pcp`: PCPs from singletons
- PCP filters (see below)


### Pre-IQ-TREE filters

#### Sliding window filter
Sequences with more than 10 mutations relative to naive sequence in any window of 20 nucleotide sites are removed before IQ-TREE processing. Data sets that *did not* have this filter are labeled with `NoWinCheck`.

#### Unmutated invariants
Productive sequences with the requirement that the conserved Cys and Trp/Phe that bound the CDR3 are unmutated are labeled with `UnmutInv`. (Note: this is in contrast to the previous convention where `InclMutInv` label denotes when this requirement *was not* applied.)


### PCP Filters

#### Site Masking
It may be that some sequences have sites where the nucleotide is undetermined and assigned `N`. For each clonal family, sites that have `N` for some sequence are then masked to be `N` at those sites for all sequences. PCP files with this masking procedure are labeled with `MASKED` in the file name.

#### PCPs without identical parent and child sequences
`NI` (non-identical) label in the file name.

#### PCPs without naive sequence
`no-naive` label in the file name.

#### PCPs without Ns or naive sequence
`noN_no-naive` label in the file name.

#### PCPs must have Cys at IMGT site 23 and 104
`ConsCys` in the file name.


## PCP data format
Column names with `_*` indicate the actual names will be `_heavy` or `_light` for heavy chain or light chain sequences, respectively.

|column name | description|
|---|---|
| `sample_id` | sample label |
| `family` | clonal family label within a sample |
| `parent_name` | label of the parent sequence |
| `parent_*` | parent sequence |
| `child_name` | label of the child sequence |
| `child_*` | child sequence |
| `branch_length` | branch length computed in IQ-TREE |
| `depth` | number of edges away the child sequence is from the naive sequence in the inferred tree |
| `distance` | sum of branch lengths of the child sequence from the naive sequence in the inferred tree |
| `v_gene_*` | inferred germline V gene |
| `j_gene_*` | inferred germline J gene |
| `cdr1_codon_start_*` | 0-indexed position of the first nucleotide of the first codon in CDR1; may not make sense for out-of-frame data |
| `cdr1_codon_end_*` | 0-indexed position of the first nucleotide of the last codon in CDR1; may not make sense for out-of-frame data |
| `cdr2_codon_start_*` | 0-indexed position of the first nucleotide of the first codon in CDR2; may not make sense for out-of-frame data |
| `cdr2_codon_end_*` | 0-indexed position of the first nucleotide of the last codon in CDR2; may not make sense for out-of-frame data |
| `cdr3_codon_start_*` | 0-indexed position of the first nucleotide of the first codon in CDR3 (i.e. *after* the conserved Cys); may not make sense for out-of-frame data |
| `cdr3_codon_end_*` | 0-indexed position of the first nucleotide of the last codon in CDR3 (i.e. *before* the conserved Trp); may not make sense for out-of-frame data |
| `parent_is_naive` | True/False whether the parent is the naive sequence |
| `child_is_leaf` | True/False whether the child is a leaf node (i.e. observed sequence) |
| `light_chain_type` | `kappa` or `lambda` to describe light chain type <em>(only used for paired heavy and light chain PCPs)</em> |


## Trees CSV data format
In `trees/` directory, phylogenetic trees for each clonal family (identified by `sample_id` and `family`) are provided. Clonal family must have all PCPs present in the corresponding PCP file (e.g. no sequences dropped due to premature stop codon). For paired heavy and light chain PCPs, `rate_scale_heavy` and `rate_scale_light` report relative corrections to the evolution rate for each locus, estimated by IQ-TREE. For unpaired data, these correction factors are set to 1.

|column name | description|
|---|---|
| `sample_id` | sample label |
| `family` | clonal family label within a sample |
| `rate_scale_heavy` | Scale factor correction to branch length for heavy chain sequence |
| `rate_scale_light` | Scale factor correction to branch length for light chain sequence |
| `newick` | Newick tree string |


## Numbering schemes CSV from ANARCI
In `anarci/` directory, numbering schemes computed with ANARCI are provided. Column names in the CSV file provides the position numbering. Rows provide numbering based on a representative sequence from each clonal family. The `*_imgt.csv` files provide alignment to IMGT numbering scheme.
