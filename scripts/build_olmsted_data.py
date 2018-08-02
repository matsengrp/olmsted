#!/usr/bin/env python

import argparse
import json
import csv
from tripl import tripl
from ete3 import PhyloTree

def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--inputs', nargs='+')
    parser.add_argument('-C', '--csv', action="store_true")
    parser.add_argument('-c', '--clonal-families-out')
    parser.add_argument('-d', '--datasets-out')
    parser.add_argument('-s', '--sequences-out')
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

clonal_family_pull_pattern = [
   {    
     "cft.reconstruction:asr_tree": ["*"],
     "cft.reconstruction:cluster": 
     [
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
      "cft.cluster:naive_seq",
      "cft.cluster:mean_mut_freq",
      {"cft.cluster:sample": ["cft.sample:id", "cft.sample:timepoint"],
      "cft.cluster:dataset": ["cft.dataset:id"],
      "cft.cluster:partition": ["cft.partition:id", "cft.partition:logprob", "cft.partition:step"],
      "cft.cluster:subject": ["cft.subject:id"],
      "cft.cluster:v_per_gene_support": ["cft.gene_support:gene", "cft.gene_support:prob"],
      "cft.cluster:d_per_gene_support": ["cft.gene_support:gene", "cft.gene_support:prob"],
      "cft.cluster:j_per_gene_support": ["cft.gene_support:gene", "cft.gene_support:prob"],
      }
     ]
   } 
]

def createNodeRecords(node):
    data = []
    node_datum = {}
    node_datum["label"] = node_datum["id"] = node.name
    if not node.is_leaf():
        node_datum["type"] = "node"
        for n in node.children:
            children = createNodeRecords(n)
            data = data + children
    else:
        node_datum["type"] = "leaf"
    if node.up:
        node_datum["parent"] = node.up.name
        node_datum["length"] = node.get_distance(node.up)
        node_datum["distance"] = node.get_distance("naive")
    else:
        node_datum["type"] = "root"
    data.append(node_datum)
    return data

def parseTreeData(s):
    t = PhyloTree(s, format=1)
    return createNodeRecords(t)

def clean_clonal_family_record(d):
    c = d.copy()
    c['cft.reconstruction:cluster'] = c['cft.reconstruction:cluster'][0]
    if(c['cft.reconstruction:asr_tree'][0].get('tripl.file:contents')):
        c['cft.reconstruction:cluster']['cft.reconstruction:asr_tree'] = parseTreeData(list(c['cft.reconstruction:asr_tree'][0]['tripl.file:contents'])[0])
    c = c['cft.reconstruction:cluster']
    try:
        del c['cft.cluster:unique_ids']
    except Exception:
        pass    
    return c

def pull_clonal_families(t):
    result = map(comp(clean_record, clean_clonal_family_record),
            t.pull_many(clonal_family_pull_pattern, {'tripl:type': 'cft.reconstruction'}))
    return result


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
    t = tripl.TripleStore.loads(args.inputs)
    if args.datasets_out:
        write_out(pull_datasets(t), args.datasets_out, args)
    if args.clonal_families_out:
        write_out(pull_clonal_families(t), args.clonal_families_out, args)
    #if args.sequences_out:
        #write_out(pull_sequences(t), args.sequences_out, args)


if __name__ == '__main__':
    main()


