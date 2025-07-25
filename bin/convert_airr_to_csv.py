#!/usr/bin/env python3
"""
Convert AIRR full_schema_dataset.json to CSV format
"""

import json
import csv
import sys
import argparse


def flatten_clone_data(clone):
    """
    Extract relevant fields from a clone record for CSV output.
    Handles nested structures by serializing them as JSON strings.
    """
    flat_record = {
        'clone_id': clone.get('clone_id'),
        'dataset_id': clone.get('dataset_id'),
        'sample_id': clone.get('sample_id'),
        'subject_id': clone.get('subject_id'),
        'seed_id': clone.get('seed_id'),
        'size': clone.get('size'),
        'unique_seqs_count': clone.get('unique_seqs_count'),
        'rearrangement_count': clone.get('rearrangement_count'),
        'total_read_count': clone.get('total_read_count'),
        'mean_mut_freq': clone.get('mean_mut_freq'),
        'has_seed': clone.get('has_seed'),
        'type': clone.get('type'),
        'sorted_index': clone.get('sorted_index'),
        
        # V gene information
        'v_call': clone.get('v_call'),
        'v_alignment_start': clone.get('v_alignment_start'),
        'v_alignment_end': clone.get('v_alignment_end'),
        
        # D gene information
        'd_call': clone.get('d_call'),
        'd_alignment_start': clone.get('d_alignment_start'),
        'd_alignment_end': clone.get('d_alignment_end'),
        
        # J gene information
        'j_call': clone.get('j_call'),
        'j_alignment_start': clone.get('j_alignment_start'),
        'j_alignment_end': clone.get('j_alignment_end'),
        
        # Junction information
        'junction_length': clone.get('junction_length'),
        'junction_start': clone.get('junction_start'),
        
        # Sequence data
        'germline_alignment': clone.get('germline_alignment'),
        'germline_alignment_length': len(clone.get('germline_alignment', '')),
        
        # Partition info
        'partition_id': clone.get('partition', {}).get('id') if isinstance(clone.get('partition'), dict) else None,
        'partition_step': clone.get('partition', {}).get('step') if isinstance(clone.get('partition'), dict) else None,
        
        # Tree count
        'tree_count': len(clone.get('trees', [])),
        
        # Path length
        'path_length': len(clone.get('path', [])),
        
        # Gene support counts
        'v_gene_support_count': len(clone.get('v_per_gene_support', [])),
        'd_gene_support_count': len(clone.get('d_per_gene_support', [])),
        'j_gene_support_count': len(clone.get('j_per_gene_support', [])),
    }
    
    return flat_record


def flatten_tree_and_node_data(clone, tree_idx, tree, node_id, node):
    """
    Create a flattened record containing clone, tree, and node data.
    Each row represents one tree node.
    """
    # Start with clone data
    clone_data = flatten_clone_data(clone)
    
    # Add tree-level data
    tree_data = {
        'tree_idx': tree_idx,
        'tree_ident': tree.get('ident'),
        'tree_id': tree.get('tree_id'),
        'newick': tree.get('newick'),
        'downsampling_strategy': tree.get('downsampling_strategy'),
        'downsampled_count': tree.get('downsampled_count'),
        'total_tree_nodes': len(tree.get('nodes', {})),
    }
    
    # Add node-level data
    node_data = {
        'node_id': node_id,
        'node_sequence_id': node.get('sequence_id'),
        'node_distance': node.get('distance'),
        'node_lbr': node.get('lbr'),
        'node_lbi': node.get('lbi'),
        'node_cluster_timepoint_multiplicities': json.dumps(node.get('cluster_timepoint_multiplicities', [])),
        'node_aa_sequence': node.get('aa_sequence'),
        'node_sequence': node.get('sequence'),
        'node_affinity': node.get('affinity'),
        'node_naive': node.get('naive', False),
    }
    
    # Combine all data
    combined_record = {}
    combined_record.update(clone_data)
    combined_record.update(tree_data)
    combined_record.update(node_data)
    
    return combined_record


def convert_json_to_csv(json_file, csv_file):
    """
    Convert AIRR JSON file to CSV format with flattened tree and node data.
    Each row represents one tree node, with clone and tree data repeated.
    """
    # Load JSON data
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    # Extract metadata
    metadata = {
        'dataset_id': data.get('dataset_id'),
        'build_id': data.get('build', {}).get('id'),
        'build_time': data.get('build', {}).get('time'),
        'build_commit': data.get('build', {}).get('commit', '').strip(),
    }
    
    # Process clones
    clones = data.get('clones', [])
    
    if not clones:
        print("No clones found in the JSON file.")
        return
    
    # Flatten all clone/tree/node combinations
    all_records = []
    total_nodes = 0
    
    for clone in clones:
        trees = clone.get('trees', [])
        
        if not trees:
            # If no trees, create one record with just clone data
            flat_record = flatten_clone_data(clone)
            flat_record.update(metadata)
            all_records.append(flat_record)
        else:
            # Process each tree and its nodes
            for tree_idx, tree in enumerate(trees):
                nodes = tree.get('nodes', {})
                
                if not nodes:
                    # Tree exists but no nodes - create record with tree data
                    tree_data = {
                        'tree_idx': tree_idx,
                        'tree_ident': tree.get('ident'),
                        'tree_id': tree.get('tree_id'),
                        'newick': tree.get('newick'),
                        'downsampling_strategy': tree.get('downsampling_strategy'),
                        'downsampled_count': tree.get('downsampled_count'),
                        'total_tree_nodes': 0,
                    }
                    
                    flat_record = flatten_clone_data(clone)
                    flat_record.update(tree_data)
                    flat_record.update(metadata)
                    all_records.append(flat_record)
                else:
                    # Process each node in the tree
                    for node_id, node in nodes.items():
                        flat_record = flatten_tree_and_node_data(clone, tree_idx, tree, node_id, node)
                        flat_record.update(metadata)
                        all_records.append(flat_record)
                        total_nodes += 1
    
    # Write to CSV
    if all_records:
        fieldnames = sorted(all_records[0].keys())
        
        with open(csv_file, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(all_records)
        
        print(f"Successfully converted {len(clones)} clones with {total_nodes} total tree nodes to CSV")
        print(f"Output file: {csv_file}")
        print(f"Total rows: {len(all_records)}")
        print(f"Fields included: {len(fieldnames)} columns")
    else:
        print("No data to write to CSV.")


def main():
    parser = argparse.ArgumentParser(description='Convert AIRR JSON to CSV format')
    parser.add_argument('input', help='Input JSON file path')
    parser.add_argument('-o', '--output', help='Output CSV file path (default: input_file.csv)')
    
    args = parser.parse_args()
    
    # Determine output file name
    if args.output:
        output_file = args.output
    else:
        output_file = args.input.rsplit('.', 1)[0] + '.csv'
    
    try:
        convert_json_to_csv(args.input, output_file)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()