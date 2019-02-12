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


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--inputs', nargs='+')
    parser.add_argument('-o', '--data-outdir')
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

def merge(d, d2):
    d = d.copy()
    d.update(d2)
    return d

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


# OK; Here's what we're going to do.

# We want constructors which describe the space of attrs we're talking about here.

def id_spec(desc=None):
    return dict(description=(desc or "Identifier"), type="string")

def multiplicity_spec(desc=None):
    return dict(description=(desc or "Number of times sequence was observed"), type="integer", "minimum"=0)


ident_spec = {
    "description": "UUID specific to the given object",
    "type": "string"}

build_spec = {
    "description": "Information about how a dataset was built",
    "type": "object",
    "required": ["commit"],
    "properties": {
      "commit": {
        "description": "Commit sha of whatever build system you used to process the data",
        "type": "integer"},
      "time": {
        "description": "Time at which build was initiated",
        "type": "string"}}}


timepoint_multiplicity_spec = {
    "description": "Multiplicity at a specific time",
    "type": "object",
    "properties": {
        # TODO timepoint_id?
        "timepoint_id": {
            "description": "Id associated with the timepoint in question",
            "type": "string"},
        "multiplicity": multiplicity_spec("Number of times sequence was observed at the given timepoint")}}


sequence_spec = {
    "description": "Nucelotide sequence record",
    "id": "Sequence id",
    "type": "object",
    "required": ["id", "nt_seq"],
    "properties": {
        "id": id_spec("Sequence id"),
        "nt_seq": {
            "description": "Literal nucleotide sequence",
            # add pattern matching for AGCT-* etc?
            "type": "string"},
        "timepoint": {
            "description": "Timepoint associated with sequence, if any",
            "type": "string"},
        "multiplicity": multiplicity_spec(),
        "cluster_multiplicity": multiplicity_spec(
            "If clonal family sequences were downsampled by clustering, the cummulative number of times" +
                " sequences in cluster were observed"),
        "timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint",
            "type": "array",
            "items": timepoint_multiplicity_spec},
        "cluster_timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint, including sequences falling in" +
                " the same cluster if clustering-based downsampling was performed.",
            "type": "array",
            "items": timepoint_multiplicity_spec},
        # compute:
        # * lbi, lbr? we should have the tree available to do this but need to coordinate with Duncan
        # * aa_seq
        # * label: do we need to compute this? we include this already but may not need to
        "lbi": {
            "description": "Local branching index",
            "type": "number"},
        "lbr": {
            "description": "Local branching rate (derivative of lbi)",
            "type": "number"},
        "affinity": {
            # TODO are there units associated with this? Better description?
            "description": "Immunological affinity",
            "type": "number"}}}



# Do we want to keep calling these reconstructions? trees?
reconstruction_spec = {
    "description": "Phylogenetic tree and possibly ancestral state reconstruction of sequences in a clonal family",
    "type": "object",
    "required": ["newick_tree", "sequences"],
    "properties": {
        "ident": ident_spec,
        "id": id_spec("Reconstruction id"),
        # optional
        "prune_strategy": {
            "description": "If applicable, the downsampling method",
            "type": "string"},
        "prune_count": {
            "description": "If applicable, the maximum number of sequences kept in the downsampling process",
            "minumum": 3,
            "type": "ineger"},
        # TODO currently named newick_string; need to change
        "newick_tree": {
            "description": "Reconstructed tree in newick format",
            "type": "string"},
        # TODO instead of asr_tree
        "sequences": {
            "description": "Sequences and sequence metadata",
            "type": "array",
            "items": sequence_spec}
        # TODO need inferred_naive_name?
        # We should also change from asr_tree as the output key to just `tree_nodes` or something
        }}

def natural_number(desc):
    return dict(description=desc, minimum=0, type="integer")

clonal_family_spec = {
    "description": "Clonal family of sequences deriving from a particular reassortment event",
    "type": "object",
    "required": ["n_seqs", "mean_mut_freq", "v_start", "v_end", "j_start", "j_end"],
    "properties": {
        "id": id_spec("Clonal family id"),
        "ident": ident_spec,
        # Do we also need another value for the number of seqs counting multiplicity?
        "n_seqs": {
            "description": "Number of sequences in the clonal family",
            "minimum": 1,
            "type": "integer"},
        # do we currently compute this pre prune or what? account for multiplicity?
        "mean_mut_freq": {
            "description": "Mean mutation frequency across sequences in the cluster",
            "minimum": 1,
            "type": "integer"},
        "naive_seq": {
            "description": "Naive nucleotide sequence",
            "type": "string"},
        "has_seed": {
            "description": "Does this clonal family have a seed sequence in it?",
            "type": "boolean"},
        # Rearrangement data
        "v_start": natural_number("Position in v gene at which rearrangement starts"),
        "v_end": natural_number("Position in v gene at which rearrangement ends"),
        "v_gene": {
            "description": "V gene used in rearrangement",
            "type": "string"},
        "d_start": natural_number("Position in d gene at which rearrangement starts"),
        "d_end": natural_number("Position in d gene at which rearrangement ends"),
        "d_gene": {
            "description": "D gene used in rearrangement",
            "type": "string"},
        "j_start": natural_number("Position in j gene at which rearrangement starts"),
        "j_end": natural_number("Position in j gene at which rearrangement ends"),
        "j_gene": {
            "description": "J gene used in rearrangement",
            "type": "string"},
        "cdr3_length": natural_number("Length of CDR3 region"),
        "cdr3_start": natural_number("Start of the CDR3 region"),
        # Should this really be nested this way or the other way?
        "sample": {
            "description": "Sample information",
            "type": "object",
            "required": ["locus"],
            "properties": {
                "ident": ident_spec,
                "id": id_spec("Sample id"),
                "timepoint": {
                    "description": "Timepoint associated with this sample (may choose 'merged' if data has" +
                        " been combined from multiple timepoints)",
                    "type": "string"},
                "locus": {
                    "description": "B-cell Locus",
                    "type": "string"}}},
        "subject": {
            "description": "Subject from which the clonal family was sampled",
            "type": "object",
            "required": ["id"],
            "properties": {
                "ident": ident_spec,
                "id": id_spec("Subjectd id")}},
        # TODO need to clean this up as well; probably doesn't need to be specified like this
        "seed": {
            "description": "Seed",
            "type": "object",
            "required": ["id"],
            "properties": {
                "ident": ident_spec,
                "id": id_spec("Seed id")}},
        "reconstructions": {
            "description": "Phylogenetic reconstructions, and possibly ancestral sequence reconstructions",
            "type": "array",
            "items": reconstruction_spec}}}
        # leaving out for now
        # 'partition': ['ident', 'id', 'logprob', 'step'],
        # 'v_per_gene_support': ['ident', 'gene', 'prob'],
        # 'd_per_gene_support': ['ident', 'gene', 'prob'],
        # 'j_per_gene_support': ['ident', 'gene', 'prob'],

dataset_spec = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://olmstedviz.org/input.schema.json",
    "title": "Olmsted Dataset",
    "description": "Olmsted dataset input file",
    "type": "object",
    "required": ["id", "clonal_families"],
    "properties": {
        "ident": ident_spec,
        "id": {
            "description": "Unique identifier for a collection of data",
            "type": "string"},
        "build": build_spec,
        "clonal_families": {
            "description": "Information about each of the clonal families",
            "type": "array",
            "items": clonal_family_spec}}}


