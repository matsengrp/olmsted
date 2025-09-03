#!/usr/bin/env python3
"""
Generate test data for performance testing the Olmsted webapp.

This script creates realistic AIRR JSON datasets of specified sizes for
performance testing purposes.
"""

import json
import random
import string
import argparse
from datetime import datetime
import sys


def generate_sequence(length=300):
    """Generate a random nucleotide sequence."""
    return ''.join(random.choices('ACGT', k=length))


def generate_tree_node(node_id, parent_id=None, depth=0, evolution_rate=0.05):
    """Generate a single tree node."""
    seq = generate_sequence()
    return {
        "node_id": node_id,
        "parent": parent_id,
        "sequence_alignment": seq,
        "sequence_alignment_aa": ''.join(random.choices('ACDEFGHIKLMNPQRSTVWY', k=len(seq)//3)),
        "distance": depth * random.uniform(0.01 * evolution_rate, 0.05 * evolution_rate),
        "length": random.uniform(0.001 * evolution_rate, 0.01 * evolution_rate),
        "unique_seqs_count": random.randint(1, 50),
        "mean_mut_freq": random.uniform(0.01 * evolution_rate, 0.15 * evolution_rate),
        "timepoint_multiplicities": {},
        "lbi": random.uniform(0, 1) if random.random() > 0.5 else None,
        "lbr": random.uniform(0, 1) if random.random() > 0.5 else None,
        "affinity": random.uniform(0, 100) if random.random() > 0.3 else None
    }


def generate_newick_from_tree(tree):
    """Convert tree nodes and edges to newick format."""
    nodes = {node["node_id"]: node for node in tree["nodes"]}
    root_id = tree["root_node"]
    
    def build_newick(node_id):
        node = nodes[node_id]
        children = [n for n in tree["nodes"] if n.get("parent") == node_id]
        
        if not children:
            # Leaf node
            return f"{node_id}:{node['length']:.6f}"
        else:
            # Internal node
            child_strings = [build_newick(child["node_id"]) for child in children]
            return f"({','.join(child_strings)}){node_id}:{node['length']:.6f}"
    
    return build_newick(root_id) + ";"


def generate_tree(clone_id, num_nodes=50, evolution_rate=0.05):
    """Generate a tree with specified number of nodes."""
    nodes = []
    edges = []
    
    # Create root node
    root_id = f"{clone_id}_root"
    nodes.append(generate_tree_node(root_id, None, 0, evolution_rate))
    
    # Create other nodes with random parent selection
    for i in range(1, num_nodes):
        node_id = f"{clone_id}_node_{i}"
        # Select a random parent from existing nodes
        parent_idx = random.randint(0, len(nodes) - 1)
        parent_id = nodes[parent_idx]["node_id"]
        depth = nodes[parent_idx].get("distance", 0) + 1
        
        node = generate_tree_node(node_id, parent_id, depth, evolution_rate)
        nodes.append(node)
        
        # Add edge
        edges.append([parent_id, node_id, node["length"]])
    
    return {
        "tree_id": f"tree_{clone_id}",
        "clone_id": clone_id,
        "ident": f"tree_{clone_id}_ident",
        "nodes": nodes,
        "edges": edges,
        "root_node": root_id
    }


def generate_clone(clone_index, dataset_id, subject_id, num_nodes=50, evolution_rate=0.05):
    """Generate a single clone with tree."""
    clone_id = f"clone_{clone_index:04d}"
    
    # Generate the tree for this clone
    tree = generate_tree(clone_id, num_nodes, evolution_rate)
    
    # Generate V/D/J gene calls
    v_genes = ["IGHV1-2*01", "IGHV1-3*01", "IGHV2-5*01", "IGHV3-11*01", "IGHV3-23*01"]
    d_genes = ["IGHD1-1*01", "IGHD2-2*01", "IGHD3-3*01", "IGHD4-4*01", "IGHD5-5*01"]
    j_genes = ["IGHJ1*01", "IGHJ2*01", "IGHJ3*01", "IGHJ4*01", "IGHJ5*01"]
    
    # Get root node for germline sequence
    root_node = next(n for n in tree["nodes"] if n["node_id"] == tree["root_node"])
    
    clone = {
        "clone_id": clone_id,
        "ident": f"{clone_id}_ident",
        "dataset_id": dataset_id,
        "subject_id": subject_id,
        "sample_id": f"sample_{random.randint(1, 5)}",
        "unique_seqs_count": sum(n["unique_seqs_count"] for n in tree["nodes"]),
        "has_seed": random.choice([True, False]),
        "v_call": random.choice(v_genes),
        "d_call": random.choice(d_genes) if random.random() > 0.3 else None,
        "j_call": random.choice(j_genes),
        "v_alignment_start": 0,
        "v_alignment_end": 296,
        "d_alignment_start": 150,  # Always provide a value
        "d_alignment_end": 170,    # Always provide a value  
        "j_alignment_start": 297,
        "j_alignment_end": 350,
        "junction_start": 280,
        "junction_length": 45,
        "germline_alignment": root_node["sequence_alignment"],
        "mean_mut_freq": random.uniform(0.01, 0.15),
        "sample": {
            "locus": random.choice(["IGH", "IGK", "IGL"]),
            "timepoint_id": f"timepoint_{random.randint(1, 3)}"
        },
        "trees": [{
            "tree_id": tree["tree_id"],
            "ident": tree["ident"]
        }]
    }
    
    return clone, tree


def generate_dataset(num_clones=1000, nodes_per_tree=50, dataset_name="performance_test", evolution_rate=0.05):
    """Generate a complete dataset with specified number of clones."""
    
    print(f"Generating dataset with {num_clones} clones, ~{nodes_per_tree} nodes per tree...")
    
    dataset_id = f"dataset_{dataset_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    subject_id = "subject_001"
    
    clones = []
    samples = []
    
    # Generate samples first
    for i in range(5):
        samples.append({
            "sample_id": f"sample_{i+1}",
            "subject_id": subject_id,
            "timepoint_id": f"timepoint_{random.randint(1, 3)}",
            "locus": random.choice(["IGH", "IGK", "IGL"])
        })
    
    # Generate clones with embedded trees (AIRR format)
    for i in range(num_clones):
        if i % 100 == 0:
            print(f"  Generated {i}/{num_clones} clones...")
        
        # Vary the number of nodes per tree slightly for realism
        num_nodes = random.randint(max(10, nodes_per_tree - 20), nodes_per_tree + 20)
        clone, tree = generate_clone(i, dataset_id, subject_id, num_nodes, evolution_rate)
        
        # Create AIRR-compatible tree (metadata + nodes as dict + newick)
        nodes_dict = {}
        for node in tree["nodes"]:
            # Determine node type
            children = [n for n in tree["nodes"] if n.get("parent") == node["node_id"]]
            node_type = "leaf" if not children else "internal"
            
            nodes_dict[node["node_id"]] = {
                "distance": node["distance"],
                "sequence_id": node["node_id"],
                "lbr": node.get("lbr") or 0.0,
                "lbi": node.get("lbi") or 0.0,
                "cluster_timepoint_multiplicities": [{"multiplicity": 1, "timepoint_id": "no-timepoint"}],
                "parent": node.get("parent"),  # Can be None for root
                "timepoint_multiplicities": [{"multiplicity": 1, "timepoint_id": "no-timepoint"}],
                "multiplicity": 1,
                "sequence_alignment": node["sequence_alignment"],
                "cluster_multiplicity": 1,
                "timepoint_id": "no-timepoint",
                "length": node["length"],
                "sequence_alignment_aa": node["sequence_alignment_aa"],
                "affinity": node.get("affinity"),
                "type": node_type
            }
        
        airr_tree = {
            "tree_id": tree["tree_id"],
            "ident": tree["ident"],
            "newick": generate_newick_from_tree(tree),
            "nodes": nodes_dict
        }
        clone["trees"] = [airr_tree]
        clones.append(clone)
    
    # Create AIRR format (not consolidated)
    airr_dataset = {
        "dataset_id": dataset_id,
        "name": dataset_name,
        "subjects_count": 1,
        "clone_count": num_clones,
        "timepoints_count": 3,
        "schema_version": "2.0.0",
        "build": {
            "time": datetime.now().isoformat(),
            "commit": "test-data-generator"
        },
        "samples": samples,
        "clones": clones  # Clones with embedded trees
    }
    
    return airr_dataset


def estimate_size(num_clones, nodes_per_tree):
    """Estimate the approximate file size."""
    # Rough estimates based on typical JSON structure
    bytes_per_node = 500  # Each node with sequences
    bytes_per_clone = 1000  # Clone metadata
    bytes_per_tree_metadata = 200  # Tree structure overhead
    
    total_nodes = num_clones * nodes_per_tree
    estimated_bytes = (
        total_nodes * bytes_per_node +
        num_clones * bytes_per_clone +
        num_clones * bytes_per_tree_metadata
    )
    
    return estimated_bytes / (1024 * 1024)  # Convert to MB


def main():
    parser = argparse.ArgumentParser(
        description='Generate test data for Olmsted webapp performance testing'
    )
    parser.add_argument(
        '--clones', 
        type=int, 
        default=1000,
        help='Number of clonal families to generate (default: 1000)'
    )
    parser.add_argument(
        '--nodes', 
        type=int, 
        default=50,
        help='Average number of nodes per tree (default: 50)'
    )
    parser.add_argument(
        '--name',
        default='performance_test',
        help='Dataset name (default: performance_test)'
    )
    parser.add_argument(
        '--output',
        default='test_data.json',
        help='Output file path (default: test_data.json)'
    )
    parser.add_argument(
        '--target-size',
        type=int,
        help='Target file size in MB (overrides --clones)'
    )
    parser.add_argument(
        '--evolution-rate',
        type=float,
        default=0.05,
        help='Base evolution rate for generating mutations (default: 0.05)'
    )
    
    args = parser.parse_args()
    
    # If target size is specified, calculate number of clones
    if args.target_size:
        estimated_mb = estimate_size(args.clones, args.nodes)
        scale_factor = args.target_size / estimated_mb
        args.clones = int(args.clones * scale_factor)
        print(f"Targeting {args.target_size}MB file size with ~{args.clones} clones")
    
    # Show estimated size
    estimated_mb = estimate_size(args.clones, args.nodes)
    print(f"Estimated file size: {estimated_mb:.1f}MB")
    
    # Generate the dataset
    dataset = generate_dataset(args.clones, args.nodes, args.name, args.evolution_rate)
    
    # Write to file
    print(f"Writing to {args.output}...")
    with open(args.output, 'w') as f:
        json.dump(dataset, f, indent=2)
    
    # Report actual file size
    import os
    actual_size = os.path.getsize(args.output) / (1024 * 1024)
    print(f"Generated {args.output}: {actual_size:.1f}MB with {args.clones} clones")
    
    # Print summary statistics
    print(f"\nDataset Statistics:")
    print(f"  Clones: {args.clones}")
    print(f"  Trees: {len(dataset['clones'])}")  # Each clone has one tree
    print(f"  Avg nodes/tree: {args.nodes}")
    print(f"  File size: {actual_size:.1f}MB")
    print(f"  Size/clone: {actual_size/args.clones*1024:.1f}KB")


if __name__ == "__main__":
    main()