#!/usr/bin/env python

from __future__ import division
import argparse
import json
import csv
from tripl import tripl
import warnings
from ete3 import PhyloTree
import functools as fun

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-S', '--schema', default='schema.json')
    parser.add_argument('-i', '--inputs', nargs='+')
    parser.add_argument('-C', '--csv', action="store_true")
    parser.add_argument('-c', '--clonal-families-out')
    parser.add_argument('-n', '--inferred-naive-name', default='inferred_naive')
    parser.add_argument('-d', '--datasets-out')
    parser.add_argument('-s', '--sequences-out')
    parser.add_argument('-v', '--verbose', action='store_true')
    return parser.parse_args()

# Some generic data processing helpers helpers

def comp(f, g):
    def h(*args, **kw_args):
        return f(g(*args, **kw_args))
    return h

def strip_ns(a):
    return a.split(':')[-1]

inf = float("inf")
neginf = float("-inf")

def clean_record(d):
    if isinstance(d, list):
        return map(clean_record, d)
    elif isinstance(d, dict):
        return {strip_ns(k): clean_record(v)
                for k, v in d.items()}
    # can't have infinity in json
    elif d == inf or d == neginf:
        return None
    else:
        return d


# Pulling datasets information out

datasets_pull_pattern = [
    "db:ident",
    "tripl:type",
    "cft.dataset:id",
    "cft.cluster:_dataset",
    "cft.subject:_dataset",
    "cft.timepoint:_dataset",
    {"cft.dataset:build": ["cft.build:id", "cft.build:time", "cft.build:commit"]}]


def clean_dataset_record(d):
    d = d.copy()
    d['n_clonal_families'] = len(d['cft.cluster:_dataset'])
    d['n_subjects'] = len(d['cft.subject:_dataset'])
    d['n_timepoints'] = len(d['cft.timepoint:_dataset'])
    del d['cft.cluster:_dataset'], d['cft.subject:_dataset'], d['cft.timepoint:_dataset']
    return d

def pull_datasets(t):
    records = list(t.pull_many(datasets_pull_pattern, {'tripl:type': 'cft.dataset'}))
    return map(comp(clean_record, clean_dataset_record), records)


# Pulling clonal families information out


reconstruction_pull_pattern = [
    "db:ident",
    "tripl:type",
    "cft.reconstruction:id",
    "cft.reconstruction:prune_strategy",
    "cft.reconstruction:prune_count",
    "cft.reconstruction:prune_count",
    {"cft.reconstruction:seqmeta": [{"tripl.csv:data": ["bio.seq:id", "cft.seq:cluster_multiplicity", "cft.seq:multiplicity"]}],
# comment this in and make necessary changes to properly read out timepoint multiplicity metadata when we can for #56
#    {"cft.reconstruction:seqmeta": [{"tripl.csv:data": ["bio.seq:id", "cft.seq:cluster_multiplicity", "cft.seq:multiplicity", "cft.seq:timepoints", "cft.seq:timepoint_multiplicities"]}],
     "cft.reconstruction:cluster_aa": [{"bio.seq:set": ["*"]}],
     "cft.reconstruction:asr_tree": ["*"],
     "cft.reconstruction:asr_seqs": ['tripl.file:path', {'bio.seq:set': ['bio.seq:id', 'bio.seq:seq']}]}]

clonal_family_pull_pattern = [
      "db:ident",
      "tripl:type",
      "cft.cluster:id",
      "cft.cluster:naive_seq",
      "cft.cluster:has_seed",
      "cft.cluster:n_seqs",
      "cft.cluster:n_sampled_seqs",
      "cft.cluster:size",
      "cft.cluster:sorted_index",
      "cft.cluster:v_end",
      "cft.cluster:v_start",
      "cft.cluster:v_gene",
      "cft.cluster:d_end",
      "cft.cluster:d_gene",
      "cft.cluster:d_start",
      "cft.cluster:j_end",
      "cft.cluster:j_gene",
      "cft.cluster:j_start",
      "cft.cluster:cdr3_length",
      "cft.cluster:cdr3_start",
      "cft.cluster:path",
      "cft.cluster:naive_seq",
      "cft.cluster:mean_mut_freq",
      {"cft.cluster:seed": ["db:ident", "cft.seed:id"],
       "cft.cluster:sample": ["db:ident", "cft.sample:id", "cft.sample:timepoint"],
       "cft.cluster:dataset": ["db:ident", "cft.dataset:id"],
       "cft.cluster:partition": ["db:ident", "cft.partition:id", "cft.partition:logprob", "cft.partition:step"],
       "cft.cluster:subject": ["db:ident", "cft.subject:id"],
       "cft.cluster:v_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.cluster:d_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.cluster:j_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.reconstruction:_cluster": reconstruction_pull_pattern}]

def create_node_records(args, tree, nt_seqs_dict, aa_seqs_dict, seqmeta_dict):
    "This currently does a bunch of work"

def create_seqs_dict(seq_records):
    d = dict()
    for record in seq_records:
        d[record["bio.seq:id"]] = record["bio.seq:seq"]
    return d

def create_seqmeta_dict(seqmeta_records):
    d = dict()
    for record in seqmeta_records:
        #insert some code here to parse the colon separated values and nest the timepoint multiplicities as objects (see below for other comments mentioning #56) 
        seq_id = record["bio.seq:id"]
        d[seq_id] = record
    return d


def try_del(d, attr):
    try:
        del d[attr]
    except Exception:
        pass

def parse_tree_data(args, c):
    # create a phylo tree object
    newick_tree = c['cft.reconstruction:asr_tree']['tripl.file:contents']
    newick_tree_path = str(c['cft.reconstruction:asr_tree']['tripl.file:path'])
    tree = PhyloTree(newick_tree, format=1)
    # parse out sequences and other sequence metadata
    aa_seqs_dict = create_seqs_dict(c['cft.reconstruction:cluster_aa']['bio.seq:set'])
    nt_seqs_dict = create_seqs_dict(c['cft.reconstruction:asr_seqs']['bio.seq:set'])
    seqmeta_dict = create_seqmeta_dict(c['cft.reconstruction:seqmeta']['tripl.csv:data'])

    # Note that this function is impure; it's mutable over leaves_counter and the internal nodes
    leaves_counter = {'count': 1}
    def process_node(n):
        n.label = n.id = n.name
        n.nt_seq = nt_seqs_dict[n.name]
        n.aa_seq = aa_seqs_dict[n.name]
        mult = None
        clust_mult = None
        # change this (and the next few commented out bits) to get the array of timepoint multiplicity objects from the seqmeta dict for #56 
        #timepoint_mults = None
        if n.name in seqmeta_dict.keys():
            #timepoint_mults = seqmeta_dict[n.name]["cft.seq:multiplicities"]
            mult = seqmeta_dict[n.name]["cft.seq:multiplicity"]
            clust_mult = seqmeta_dict[n.name]["cft.seq:cluster_multiplicity"]
        n.multiplicity = int(mult) if mult else mult
        n.cluster_multiplicity = int(clust_mult) if clust_mult else clust_mult
        #n.timepoint_multiplicities = int(timepoint_mults) if timepoint_mults else timepoint_mults
        n.type = "node"
        if n.is_leaf():
            # get height for leaves
            n.type = "leaf"
            n.height = leaves_counter['count']
            leaves_counter['count'] += 1
        else:
            # get height for non leaves
            total_height = 0
            for child in n.children:
                total_height += child.height
            avg_height = total_height/len(n.children)
            n.height = avg_height
        if n.up:
            # get parent info, distance for non root
            n.parent = n.up.name
            n.length = n.get_distance(n.up)
            try:
                n.distance = n.get_distance(args.inferred_naive_name)
            except Exception as e:
                if args.verbose:
                    warnings.warn("Unable to compute distance to naive '" + str(args.inferred_naive_name) + "' in file " + newick_tree_path)
                    print("newick tree:", newick_tree)
                raise e
        else:
            # n is root
            n.type = "root"
            n.parent = None
            n.length = 0.0
            n.distance = 0.0
        return ({'id': n.id,
                 'label': n.label,
                 'type': n.type,
                 'parent': n.parent,
                 'length': n.length,
                 'distance': n.distance,
                 'height': n.height,
                 'nt_seq': n.nt_seq,
                 'aa_seq': n.aa_seq,
                 'multiplicity': n.multiplicity,
                 'cluster_multiplicity': n.cluster_multiplicity,
                 # change this to real list of key value objects for timepoint multiplicities for #56
                 'timepoint_multiplicities': [
                                              {'timepoint':'test', 'multiplicity':7}, 
                                              {'timepoint':'test2', 'multiplicity':13}
                                             ]
              })

    # map through and process the nodes
    return map(process_node, tree.traverse('postorder'))

def clean_reconstruction_record(args, d):
    c = d.copy()
    if c['cft.reconstruction:asr_tree'].get('tripl.file:contents'):
        c['cft.reconstruction:newick_string'] = c['cft.reconstruction:asr_tree']['tripl.file:contents']
        c['cft.reconstruction:asr_tree'] = parse_tree_data(args, c)
    # Do we want to remove the raw data to keep size down?
    for var in ['cft.reconstruction:cluster_aa', 'cft.reconstruction:asr_seqs', 'cft.reconstruction:seqmeta']:
        try_del(c, var)
    return c


def clean_clonal_family_record(args, d):
    try:
        c = d.copy()
        c['cft.cluster:reconstructions'] = map(fun.partial(clean_reconstruction_record, args), c['cft.reconstruction:_cluster'])
        try_del(c, 'cft.reconstruction:_cluster')
        try_del(c, 'cft.cluster:unique_ids')
        return c
    except Exception as e:
        if args.verbose:
            warnings.warn("Failed to process cluster: " + str(d.get('db:ident')))
        return None

def pull_clonal_families(args, t):
    result = map(comp(clean_record, fun.partial(clean_clonal_family_record, args)),
            t.pull_many(clonal_family_pull_pattern, {'tripl:type': 'cft.cluster'}))
    bad_families = filter(lambda c: not c, result)
    good_families = filter(None, result)
    if bad_families:
        warnings.warn("{} (of {}) clonal families couldn't be processed".format(len(bad_families), len(result)))
    else:
        print("processed {} clonal families successfully".format(len(result)))
    #result[0]['cft.reconstruction:cluster']['cft.reconstruction:asr_tree'] = parse_tree_data(list(result['cft.reconstruction:cluster']['cft.reconstruction:asr_tree']['tripl.file:contents'])[0])
    return good_families

def write_out(data, filename, args):
    with open(filename, 'w') as fh:
        if args.csv:
            data = [{k: v for k, v in d.items()}
                    for d in data]
            writer = csv.DictWriter(fh, fieldnames=sorted(data[0].keys()))
            writer.writeheader()
            writer.writerows(data)
        else:
            # Then assume json
            json.dump(data, fh, default=list,
                indent=4,
                #allow_nan=False
                )

def main():
    args = get_args()
    datasets, clonal_families = [], []
    for infile in args.inputs:
        print("\nProcessing infile: " + str(infile))
        t = tripl.TripleStore.loads([args.schema, infile])
        try:
            if args.datasets_out:
                datasets += pull_datasets(t)
            if args.clonal_families_out:
                clonal_families += pull_clonal_families(args, t)
        except Exception as e:
            warnings.warn("Unable to process infile: " + str(infile))
            warnings.warn("Processing error: " + str(e))
    if args.datasets_out:
        write_out(datasets, args.datasets_out, args)
    if args.clonal_families_out:
        write_out(clonal_families, args.clonal_families_out, args)
    #if args.sequences_out:
        #write_out(pull_sequences(t), args.sequences_out, args)


if __name__ == '__main__':
    main()


