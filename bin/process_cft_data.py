#!/usr/bin/env python

from __future__ import division
import argparse
import json
import csv
from tripl import tripl
import warnings
from ete3 import PhyloTree
import functools as fun
import os


default_schema_path = os.path.join(os.path.dirname(__file__), '..', 'schema.json')

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-S', '--schema', default=default_schema_path)
    parser.add_argument('-i', '--inputs', nargs='+')
    parser.add_argument('-C', '--csv', action="store_true")
    parser.add_argument('-o', '--data-outdir')
    # parser.add_argument('-s', '--split'
    parser.add_argument('-n', '--inferred-naive-name', default='inferred_naive')
    parser.add_argument('-v', '--verbose', action='store_true')
    return parser.parse_args()

# Some generic data processing helpers helpers

def comp(f, g):
    def h(*args, **kw_args):
        return f(g(*args, **kw_args))
    return h

def strip_ns(a):
    return a.split(':')[-1]

def dict_subset(d, keys):
    return {k: d[k] for k in keys if k in d}

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


def spy(x):
    print("debugging:", x)
    return x

def lspy(xs):
    xs_ = list(xs)
    print("debugging listable:", xs_)
    return xs_

def nospy(xs):
    return xs


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
    #import pdb; pdb.set_trace()
    records = list(t.pull_many(datasets_pull_pattern, {'tripl:type': 'cft.dataset'}))
    return map(comp(clean_record, clean_dataset_record), records)


# Pulling clonal families information out

sequence_pull_pattern = [
    "*",
    "bio.seq:id",
    "cft.seq:timepoint",
    "cft.seq:timepoints",
    "cft.seq:cluster_timepoints",
    "cft.seq:multiplicity",
    "cft.seq:cluster_multiplicity",
    "cft.seq:timepoint_multiplicities",
    "cft.seq:cluster_timepoint_multiplicities",
    "cft.seq:affinity",
    "cft.tree.node:lbi",
    "cft.tree.node:lbr"]

reconstruction_pull_pattern = [
    "db:ident",
    "tripl:type",
    "cft.reconstruction:id",
    "cft.reconstruction:prune_strategy",
    "cft.reconstruction:prune_count",
    "cft.reconstruction:prune_count",
    {"cft.reconstruction:seqmeta": [{"tripl.csv:data": sequence_pull_pattern}],
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
       "cft.cluster:sample": ["db:ident", "cft.sample:id", "cft.sample:timepoint", "cft.sample:locus"],
       "cft.cluster:dataset": ["db:ident", "cft.dataset:id"],
       "cft.cluster:partition": ["db:ident", "cft.partition:id", "cft.partition:logprob", "cft.partition:step"],
       "cft.cluster:subject": ["db:ident", "cft.subject:id"],
       "cft.cluster:v_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.cluster:d_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.cluster:j_per_gene_support": ["db:ident", "cft.gene_support:gene", "cft.gene_support:prob"],
       "cft.reconstruction:_cluster": reconstruction_pull_pattern}]


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

def listof(xs_str, f=lambda x: x):
    return map(f, xs_str.split(':'))

def listofint(xs_str):
    return listof(xs_str, int)


def parse_tree_data(args, c):
    # create a phylo tree object
    newick_tree = c['cft.reconstruction:asr_tree']['tripl.file:contents']
    newick_tree_path = str(c['cft.reconstruction:asr_tree']['tripl.file:path'])
    tree = PhyloTree(newick_tree, format=1)
    # parse out sequences and other sequence metadata
    aa_seqs_dict = create_seqs_dict(c['cft.reconstruction:cluster_aa']['bio.seq:set'])
    nt_seqs_dict = create_seqs_dict(c['cft.reconstruction:asr_seqs']['bio.seq:set'])
    seqmeta_dict = create_seqmeta_dict(c['cft.reconstruction:seqmeta']['tripl.csv:data'])
    # Note that this function is impure; it's mutable over the internal nodes
    def process_node(node):
        node.label = node.id = node.name
        node.nt_seq = nt_seqs_dict[node.name]
        node.aa_seq = aa_seqs_dict[node.name]
        for attr, parser in [
                ['cft.seq:multiplicity', int],
                ['cft.seq:timepoint_multiplicities', listofint],
                ['cft.seq:cluster_multiplicity', int],
                ['cft.seq:cluster_timepoint_multiplicities', listofint],
                ['cft.seq:timepoint', None],
                ['cft.seq:timepoints', listof],
                ['cft.seq:cluster_timepoints', listof],
                ['cft.seq:affinity', float],
                ['cft.tree.node:lbi', float],
                ['cft.tree.node:lbr', float]]:
            seqmeta = seqmeta_dict.get(node.name, {})
            node.__dict__[attr.split(':')[1]] = (parser or (lambda x: x))(seqmeta.get(attr)) if seqmeta.get(attr) else None
        node.type = "node"
        if node.is_leaf():
            node.type = "leaf"
        if node.up:
            # get parent info, distance for non root
            node.parent = node.up.name
            node.length = node.get_distance(node.up)
            try:
                node.distance = node.get_distance(args.inferred_naive_name)
            except Exception as e:
                if args.verbose:
                    warnings.warn("Unable to compute distance to naive '" + str(args.inferred_naive_name) + "' in file " + newick_tree_path)
                    print("newick tree:", newick_tree)
                raise e
        else:
            # node is root
            node.type = "root"
            node.parent = None
            node.length = 0.0
            node.distance = 0.0
        node = node
        #import pdb; pdb.set_trace()
        return ({'id': node.id,
                 'label': node.label,
                 'type': node.type,
                 'parent': node.parent,
                 'length': node.length,
                 'distance': node.distance,
                 'nt_seq': node.nt_seq,
                 'aa_seq': node.aa_seq,
                 'affinity': node.affinity,
                 'lbi': node.lbi,
                 'lbr': node.lbr,
                 'timepoint': node.timepoint,
                 'multiplicity': node.multiplicity,
                 'cluster_multiplicity': node.cluster_multiplicity,
                 # change this to real list of key value objects for timepoint multiplicities for #56
                 'timepoint_multiplicities': [{'timepoint': t, 'multiplicity': m} for t, m in
                     zip(node.timepoints or [], node.timepoint_multiplicities or [])],
                 'cluster_timepoint_multiplicities': [{'timepoint': t, 'multiplicity': m} for t, m in
                     zip(node.cluster_timepoints or [], node.cluster_timepoint_multiplicities or [])]
              })

    # map through and process the nodes
    return map(process_node, tree.traverse('postorder'))

def clean_reconstruction_record(args, d):
    c = d.copy()
    #import pdb; pdb.set_trace()
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
        #raise e
        return None

def pull_clonal_families(args, t):
    result = map(comp(clean_record, fun.partial(clean_clonal_family_record, args)),
            nospy(t.pull_many(clonal_family_pull_pattern, {'tripl:type': 'cft.cluster'})))
    #import pdb; pdb.set_trace()
    bad_families = filter(lambda c: not c, result)
    good_families = filter(None, result)
    if bad_families:
        warnings.warn("{} (of {}) clonal families couldn't be processed".format(len(bad_families), len(result)))
    else:
        print("processed {} clonal families successfully".format(len(result)))
    #result[0]['cft.reconstruction:cluster']['cft.reconstruction:asr_tree'] = parse_tree_data(list(result['cft.reconstruction:cluster']['cft.reconstruction:asr_tree']['tripl.file:contents'])[0])
    return good_families

def write_out(data, dirname, filename, args):
    if not os.path.exists(dirname):
        os.makedirs(dirname)
    full_path = os.path.normpath(os.path.join(dirname, filename))
    with open(full_path, 'w') as fh:
        print('writing '+ full_path)
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
    datasets, clonal_families_dict, reconstructions = [], {}, []
    for infile in args.inputs:
        print("\nProcessing infile: " + str(infile))
        t = tripl.TripleStore.loads([args.schema, infile])
        try:
            if args.data_outdir:
                file_datasets = pull_datasets(t)
                assert len(file_datasets) == 1, "Must have exactly one dataset per file (for now); instead had %s" % len(file_datasets)
                dataset = file_datasets[0]
                datasets.append(dataset)
                clonal_families = pull_clonal_families(args, t)
                for clonal_family in clonal_families:
                    recons = clonal_family['reconstructions']
                    reconstructions += recons
                    clonal_family['reconstructions'] = [
                            dict_subset(r, ['ident', 'id', 'prune_strategy', 'prune_count', 'type'])
                            for r in recons]
                clonal_families_dict[dataset['id']] = clonal_families
        except Exception as e:
            warnings.warn("Unable to process infile: " + str(infile))
            warnings.warn("Processing error: " + str(e))
    if args.data_outdir:
        write_out(datasets, args.data_outdir, 'datasets.json', args)
        for dataset_id, clonal_families in clonal_families_dict.items():
            write_out(clonal_families, args.data_outdir + '/', 'clonal_families.' + dataset_id + '.json' , args)
        for reconstruction in reconstructions:
            write_out(reconstruction, args.data_outdir + '/', 'reconstruction.' + reconstruction['ident']  + '.json' , args)

if __name__ == '__main__':
    main()


