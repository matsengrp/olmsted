#!/usr/bin/env python

"""
Process Parent-Child Pair (PCP) CSV files and Newick trees for Olmsted visualization.

This script handles PCP CSV format with columns:
- sample_id: Sample identifier
- parent_name: Parent node name
- child_name: Child node name
- edge_length: Branch length
- sample_count: Number of sequences

And a CSV file containing Newick trees:
- family_name: Family identifier
- newick_tree: Newick format tree string
"""

import argparse
import csv
import gzip
import json
import os
import sys
import uuid
from collections import defaultdict, OrderedDict
from functools import reduce
import ete3

# Import shared utilities from process_data.py
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from process_data import (
    SCHEMA_VERSION,
    clean_record,
    dict_subset,
    get_in,
    merge,
    strip_ns,
    write_out,
    dataset_spec,
    clone_spec,
    tree_spec,
    node_spec,
)


def parse_pcp_csv(csv_path):
    """
    Parse PCP CSV file and return a dict of families.
    
    Expected CSV format:
    sample_id,parent_name,child_name,edge_length,sample_count
    
    Returns:
        dict: {family_id: {nodes: {node_id: node_data}, edges: [(parent, child, length)]}}
    """
    families = defaultdict(lambda: {"nodes": {}, "edges": []})
    
    # Determine if file is gzipped
    if csv_path.endswith('.gz'):
        file_handle = gzip.open(csv_path, 'rt')
    else:
        file_handle = open(csv_path, 'r')
    
    with file_handle:
        reader = csv.DictReader(file_handle)
        
        # Validate required columns
        required_cols = {'sample_id', 'parent_name', 'child_name', 'edge_length', 'sample_count'}
        if not required_cols.issubset(reader.fieldnames):
            missing = required_cols - set(reader.fieldnames)
            raise ValueError(f"Missing required columns: {missing}")
        
        for row in reader:
            sample_id = row['sample_id']
            parent = row['parent_name']
            child = row['child_name']
            edge_length = float(row['edge_length'])
            sample_count = int(row['sample_count'])
            
            # Add nodes if not already present
            if parent not in families[sample_id]["nodes"]:
                families[sample_id]["nodes"][parent] = {
                    "sequence_id": parent,
                    "multiplicity": 0,
                    "timepoint_multiplicities": []
                }
            
            if child not in families[sample_id]["nodes"]:
                families[sample_id]["nodes"][child] = {
                    "sequence_id": child,
                    "multiplicity": sample_count,
                    "timepoint_multiplicities": []
                }
            else:
                # Update multiplicity if node appears multiple times
                families[sample_id]["nodes"][child]["multiplicity"] += sample_count
            
            # Add edge
            families[sample_id]["edges"].append((parent, child, edge_length))
    
    return dict(families)


def parse_newick_csv(csv_path):
    """
    Parse CSV file containing Newick trees.
    
    Expected CSV format:
    family_name,newick_tree
    
    Returns:
        dict: {family_name: newick_string}
    """
    newick_trees = {}
    
    # Determine if file is gzipped
    if csv_path.endswith('.gz'):
        file_handle = gzip.open(csv_path, 'rt')
    else:
        file_handle = open(csv_path, 'r')
    
    with file_handle:
        reader = csv.DictReader(file_handle)
        
        # Validate required columns
        required_cols = {'family_name', 'newick_tree'}
        if not required_cols.issubset(reader.fieldnames):
            missing = required_cols - set(reader.fieldnames)
            raise ValueError(f"Missing required columns: {missing}")
        
        for row in reader:
            family_name = row['family_name']
            newick_tree = row['newick_tree']
            newick_trees[family_name] = newick_tree
    
    return newick_trees


def build_newick_from_edges(nodes, edges):
    """
    Build a Newick string from parent-child edges.
    
    Args:
        nodes: dict of {node_id: node_data}
        edges: list of (parent, child, edge_length) tuples
    
    Returns:
        str: Newick format tree string
    """
    # Build adjacency list
    children = defaultdict(list)
    edge_lengths = {}
    
    for parent, child, length in edges:
        children[parent].append(child)
        edge_lengths[(parent, child)] = length
    
    # Find root (node with no parent)
    all_children = {child for _, child, _ in edges}
    all_parents = {parent for parent, _, _ in edges}
    roots = all_parents - all_children
    
    if len(roots) != 1:
        raise ValueError(f"Expected exactly one root, found {len(roots)}: {roots}")
    
    root = roots.pop()
    
    def build_subtree(node):
        """Recursively build Newick subtree."""
        if node not in children:
            # Leaf node
            return f"{node}:{edge_lengths.get((parent, node), 0.0)}"
        
        # Internal node
        subtrees = []
        for child in children[node]:
            parent = node  # Capture parent for edge length lookup
            subtrees.append(build_subtree(child))
        
        return f"({','.join(subtrees)}){node}:{edge_lengths.get((parent, node), 0.0)}"
    
    # Build the tree starting from root
    # Root doesn't have a parent edge, so handle specially
    if root not in children:
        return f"{root}:0.0;"
    
    subtrees = []
    for child in children[root]:
        parent = root
        subtrees.append(build_subtree(child))
    
    return f"({','.join(subtrees)}){root}:0.0;"


def process_pcp_to_olmsted(pcp_families, newick_trees=None):
    """
    Convert PCP format data to Olmsted format.
    
    Args:
        pcp_families: dict from parse_pcp_csv
        newick_trees: dict from parse_newick_csv (optional)
    
    Returns:
        tuple: (datasets, clones_dict, trees)
    """
    dataset_id = f"pcp-{uuid.uuid4()}"
    dataset_ident = str(uuid.uuid4())
    
    datasets = []
    clones_dict = {dataset_id: []}
    trees = []
    
    # Create dataset
    dataset = {
        "ident": dataset_ident,
        "dataset_id": dataset_id,
        "schema_version": SCHEMA_VERSION,
        "type": "pcp.dataset",
        "build": {
            "commit": "pcp-import",
            "time": ""
        },
        "subjects": [
            {
                "ident": str(uuid.uuid4()),
                "subject_id": "pcp-subject"
            }
        ],
        "samples": [],
        "seeds": [],
        "clone_count": len(pcp_families),
        "subjects_count": 1,
        "timepoints_count": 1
    }
    
    # Process each family
    for family_idx, (family_id, family_data) in enumerate(pcp_families.items()):
        clone_ident = str(uuid.uuid4())
        tree_ident = str(uuid.uuid4())
        
        # Create sample if not already present
        sample_exists = any(s["sample_id"] == family_id for s in dataset["samples"])
        if not sample_exists:
            dataset["samples"].append({
                "ident": str(uuid.uuid4()),
                "sample_id": family_id,
                "locus": "igh",  # Default locus
                "timepoint_id": "merged"
            })
        
        # Build or use provided Newick tree
        if newick_trees and family_id in newick_trees:
            newick = newick_trees[family_id]
        else:
            newick = build_newick_from_edges(family_data["nodes"], family_data["edges"])
        
        # Process nodes - add required fields
        processed_nodes = {}
        for node_id, node_data in family_data["nodes"].items():
            processed_node = {
                "sequence_id": node_id,
                "sequence_alignment": "",  # Empty for PCP format
                "sequence_alignment_aa": "",  # Empty for PCP format
                "multiplicity": node_data.get("multiplicity", 0),
                "timepoint_multiplicities": node_data.get("timepoint_multiplicities", []),
                "lbi": None,
                "lbr": None,
                "affinity": None
            }
            processed_nodes[node_id] = processed_node
        
        # Create clone
        clone = {
            "clone_id": f"family-{family_idx}",
            "ident": clone_ident,
            "dataset_id": dataset_id,
            "sample_id": family_id,
            "subject_id": "pcp-subject",
            "unique_seqs_count": len(processed_nodes),
            "total_read_count": sum(n.get("multiplicity", 0) for n in processed_nodes.values()),
            "mean_mut_freq": 0.0,  # Not available in PCP format
            "v_alignment_start": 0,
            "v_alignment_end": 0,
            "j_alignment_start": 0,
            "j_alignment_end": 0,
            "v_call": "",
            "j_call": "",
            "germline_alignment": "",
            "has_seed": False,
            "trees": [{"ident": tree_ident}]
        }
        clones_dict[dataset_id].append(clone)
        
        # Create tree
        tree = {
            "ident": tree_ident,
            "tree_id": f"pcp-tree-{family_idx}",
            "clone_id": clone["clone_id"],
            "newick": newick,
            "nodes": processed_nodes
        }
        trees.append(tree)
    
    datasets.append(dataset)
    return datasets, clones_dict, trees


def get_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Process PCP CSV and Newick files for Olmsted visualization"
    )
    parser.add_argument(
        "-i", "--input-pcp",
        required=True,
        help="Input PCP CSV file (can be gzipped)"
    )
    parser.add_argument(
        "-t", "--input-trees",
        help="Input CSV file containing Newick trees (optional, can be gzipped)"
    )
    parser.add_argument(
        "-o", "--output-dir",
        required=True,
        help="Output directory for processed JSON files"
    )
    parser.add_argument(
        "-v", "--verbose",
        action="store_true",
        help="Verbose output"
    )
    return parser.parse_args()


def main():
    """Main entry point."""
    args = get_args()
    
    try:
        # Parse PCP CSV
        print(f"Processing PCP CSV: {args.input_pcp}")
        pcp_families = parse_pcp_csv(args.input_pcp)
        print(f"Found {len(pcp_families)} families")
        
        # Parse Newick trees if provided
        newick_trees = None
        if args.input_trees:
            print(f"Processing Newick trees: {args.input_trees}")
            newick_trees = parse_newick_csv(args.input_trees)
            print(f"Found {len(newick_trees)} trees")
        
        # Convert to Olmsted format
        print("Converting to Olmsted format...")
        datasets, clones_dict, trees = process_pcp_to_olmsted(pcp_families, newick_trees)
        
        # Create output directory if needed
        os.makedirs(args.output_dir, exist_ok=True)
        
        # Write output files
        print(f"Writing output to {args.output_dir}")
        write_out(datasets, args.output_dir, "datasets.json", args)
        
        for dataset_id, clones in clones_dict.items():
            write_out(
                clones, 
                args.output_dir + "/", 
                f"clones.{dataset_id}.json", 
                args
            )
        
        for tree in trees:
            write_out(
                tree, 
                args.output_dir + "/", 
                f"tree.{tree['ident']}.json", 
                args
            )
        
        print("Processing complete!")
        
    except Exception as e:
        print(f"Error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()