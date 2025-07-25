#!/usr/bin/env python
"""
Shared utilities for processing various data formats in Olmsted.

This module contains common functions, constants, and schema definitions
used by process_airr_data.py, process_pcp_data.py, and other data processors.
"""

import json
import yaml
import os
import datetime
import jsonschema
from collections import OrderedDict

# Constants
SCHEMA_VERSION = "2.0.0"

# Utility functions
def comp(f, g):
    """
    Function composition: comp(f, g)(x) == f(g(x))
    """
    def h(*args, **kw_args):
        return f(g(*args, **kw_args))
    return h


def strip_ns(a):
    # Handle namespace stripping for both : and / separators
    return str(a).split(":")[-1].split("/")[-1]


def dict_subset(d, keys):
    return {k: d[k] for k in keys if k in d}


def merge(d, d2):
    """
    Merge d2 into d, returning a new dict (non-mutating).
    """
    d = d.copy()
    d.update(d2)
    return d


def get_in(d, path):
    """
    Retrieve value from nested dictionary using a path list.

    Args:
        d: Dictionary to traverse
        path: List of keys representing path to value

    Returns:
        Value at path or empty dict if path doesn't exist
    """
    return (
        d
        if len(path) == 0
        else get_in(d.get(path[0]) if isinstance(d, dict) else {}, path[1:])
    )


# Constants for infinity handling
inf = float("inf")
neginf = float("-inf")

def clean_record(d):
    """
    Clean a record by removing namespaces and handling special values.

    Args:
        d: Data to clean (dict, list, or value)

    Returns:
        Cleaned data
    """
    if isinstance(d, list):
        return list(map(clean_record, d))
    elif isinstance(d, dict):
        return {strip_ns(k): clean_record(v) for k, v in d.items()}
    # can't have infinity in json
    elif d == inf or d == neginf:
        return None
    else:
        return d


def spy(x):
    print("debugging:", x)
    return x


def lspy(xs):
    xs_ = list(xs)
    print("debugging listable:", xs_)
    return xs_


def nospy(xs):
    return xs


def write_out(data, dirname, filename, args):
    """
    Write data to JSON file.

    Args:
        data: Data to write
        dirname: Directory path
        filename: File name
        args: Command line arguments (for verbose flag)
    """
    output_path = os.path.join(dirname, filename)
    if args.verbose:
        print(f"writing {output_path}")

    # Ensure directory exists
    os.makedirs(dirname, exist_ok=True)

    with open(output_path, 'w') as fh:
        if isinstance(data, list) or isinstance(data, dict):
            json.dump(data, fh, indent=4, sort_keys=True)
        else:
            fh.write(data)


# Schema loading and validation functions
def load_schema(schema_path):
    """Load a JSON schema from file (supports both JSON and YAML)."""
    with open(schema_path, 'r') as f:
        if schema_path.endswith('.yaml') or schema_path.endswith('.yml'):
            return yaml.safe_load(f)
        else:
            return json.load(f)


def get_schema_path(schema_name, args):
    """Get the path to a schema file."""
    if hasattr(args, 'schema_dir') and args.schema_dir:
        return os.path.join(args.schema_dir, schema_name)
    else:
        # Default to schema in data_schema directory relative to this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        return os.path.join(script_dir, '..', 'data_schema', schema_name)


def validate_airr_main(data, schema_path=None):
    """
    Validate AIRR main data against JSON schema.

    Args:
        data: The data to validate
        schema_path: Optional path to schema file. If not provided, uses default location.

    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        schema = load_schema(schema_path)
        jsonschema.validate(instance=data, schema=schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Schema loading error: {str(e)}"


def validate_airr_tree(tree_data, schema_path=None):
    """
    Validate AIRR tree data against JSON schema.

    Args:
        tree_data: The tree data to validate
        schema_path: Optional path to schema file. If not provided, uses default location.

    Returns:
        tuple: (is_valid, error_message)
    """
    try:
        schema = load_schema(schema_path)
        jsonschema.validate(instance=tree_data, schema=schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Schema loading error: {str(e)}"


# Schema specifications
# These are simplified versions for PCP processing
# The full AIRR schemas with all validations remain in process_airr_data.py
node_spec = {
    "title": "Node",
    "description": "Information about the phylogenetic tree nodes and the sequences they represent",
    "type": "object",
    "required": ["sequence_id", "sequence_alignment", "sequence_alignment_aa"],
    "properties": {
        "sequence_id": {
            "description": "Identifier for this node",
            "type": "string"
        },
        "sequence_alignment": {
            "description": "Nucleotide sequence alignment",
            "type": "string"
        },
        "sequence_alignment_aa": {
            "description": "Amino acid sequence alignment",
            "type": ["string", "null"]
        },
        "parent": {
            "description": "Sequence ID of parent node",
            "type": ["string", "null"]
        },
        "type": {
            "description": "Type of node",
            "enum": ["leaf", "node"],
            "type": "string"
        },
        "confidence": {
            "description": "Bootstrap confidence",
            "type": ["number", "null"]
        },
        "lbi": {
            "description": "Local branching index",
            "type": ["number", "null"]
        },
        "lbr": {
            "description": "Local branching ratio",
            "type": ["number", "null"]
        },
        "distance": {
            "description": "Distance from root",
            "type": ["number", "null"]
        },
        "length": {
            "description": "Branch length",
            "type": ["number", "null"]
        },
        "timepoint_id": {
            "description": "Time point identifier",
            "type": ["string", "null"]
        },
        "timepoint_multiplicities": {
            "description": "Multiplicities at different time points",
            "type": "array",
            "items": {
                "type": ["integer", "null"]
            }
        },
        "multiplicity": {
            "description": "Total multiplicity/abundance",
            "type": ["integer", "null"]
        },
        "cluster_multiplicity": {
            "description": "Cluster multiplicity",
            "type": ["integer", "null"]
        },
        "affinity": {
            "description": "Binding affinity",
            "type": ["number", "null"]
        }
    },
    "additionalProperties": True
}

tree_spec = {
    "title": "Tree",
    "description": "Phylogenetic tree and possibly ancestral state reconstruction of sequences in a clonal family.",
    "type": "object",
    "required": ["newick", "nodes"],
    "properties": {
        "ident": {
            "description": "Tree identifier",
            "type": "string"
        },
        "timepoint_ids": {
            "description": "Time points included",
            "type": "array",
            "items": {"type": "string"}
        },
        "newick": {
            "description": "Newick format tree string",
            "type": "string"
        },
        "nodes": {
            "description": "Dictionary of nodes keyed by sequence ID",
            "type": "object",
            "additionalProperties": node_spec
        }
    },
    "additionalProperties": True
}

clone_spec = {
    "title": "Clone",
    "description": "Clonal family of sequences deriving from a particular reassortment event",
    "type": "object",
    "required": [
        "unique_seqs_count",
        "total_read_count",
        "mean_mut_freq",
        "v_alignment_start",
        "v_alignment_end",
        "j_alignment_start",
        "j_alignment_end",
        "v_call",
        "j_call"
    ],
    "properties": {
        "ident": {
            "description": "Clone identifier",
            "type": "string"
        },
        "clone_id": {
            "description": "Clone ID",
            "type": "string"
        },
        "dataset_id": {
            "description": "Dataset ID",
            "type": "string"
        },
        "sample_id": {
            "description": "Sample ID",
            "type": "string"
        },
        "subject_id": {
            "description": "Subject ID",
            "type": "string"
        },
        "unique_seqs_count": {
            "description": "Number of unique sequences",
            "type": "integer"
        },
        "total_read_count": {
            "description": "Total number of reads",
            "type": "integer"
        },
        "mean_mut_freq": {
            "description": "Mean mutation frequency",
            "type": "number"
        },
        "v_alignment_start": {
            "description": "V gene alignment start position",
            "type": "integer"
        },
        "v_alignment_end": {
            "description": "V gene alignment end position",
            "type": "integer"
        },
        "j_alignment_start": {
            "description": "J gene alignment start position",
            "type": "integer"
        },
        "j_alignment_end": {
            "description": "J gene alignment end position",
            "type": "integer"
        },
        "v_call": {
            "description": "V gene call",
            "type": "string"
        },
        "j_call": {
            "description": "J gene call",
            "type": "string"
        },
        "d_call": {
            "description": "D gene call",
            "type": ["string", "null"]
        },
        "d_alignment_start": {
            "description": "D gene alignment start position",
            "type": ["integer", "null"]
        },
        "d_alignment_end": {
            "description": "D gene alignment end position",
            "type": ["integer", "null"]
        },
        "junction_start": {
            "description": "Junction region start position",
            "type": ["integer", "null"]
        },
        "junction_length": {
            "description": "Junction region length",
            "type": ["integer", "null"]
        },
        "germline_alignment": {
            "description": "Germline sequence alignment",
            "type": ["string", "null"]
        },
        "has_seed": {
            "description": "Whether clone has seed sequence",
            "type": "boolean"
        },
        "seed_id": {
            "description": "Seed sequence identifier",
            "type": ["string", "null"]
        },
        "trees": {
            "description": "Associated trees",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ident": {
                        "description": "Tree identifier",
                        "type": "string"
                    }
                }
            }
        },
        "v_per_gene_support": {
            "description": "V gene assignment probabilities",
            "type": ["object", "null"]
        },
        "j_per_gene_support": {
            "description": "J gene assignment probabilities",
            "type": ["object", "null"]
        }
    },
    "additionalProperties": True
}

dataset_spec = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://olmstedviz.org/input.schema.json",
    "title": "Olmsted Dataset",
    "description": "Olmsted dataset input file.",
    "type": "object",
    "required": ["schema_version", "dataset_id"],
    "properties": {
        "schema_version": {
            "description": "Schema version",
            "type": "string"
        },
        "ident": {
            "description": "Dataset identifier",
            "type": "string"
        },
        "dataset_id": {
            "description": "Dataset ID",
            "type": "string"
        },
        "type": {
            "description": "Dataset type",
            "type": "string"
        },
        "build": {
            "description": "Build information",
            "type": "object",
            "properties": {
                "commit": {"type": "string"},
                "time": {"type": "string"}
            }
        },
        "subjects": {
            "description": "Subject information",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ident": {"type": "string"},
                    "subject_id": {"type": "string"}
                }
            }
        },
        "samples": {
            "description": "Sample information",
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ident": {"type": "string"},
                    "sample_id": {"type": "string"},
                    "locus": {"type": "string"},
                    "timepoint_id": {"type": "string"}
                }
            }
        },
        "seeds": {
            "description": "Seed sequences",
            "type": "array"
        },
        "clone_count": {
            "description": "Number of clones",
            "type": "integer"
        },
        "subjects_count": {
            "description": "Number of subjects",
            "type": "integer"
        },
        "timepoints_count": {
            "description": "Number of time points",
            "type": "integer"
        }
    },
    "additionalProperties": True
}
