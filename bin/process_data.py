#!/usr/bin/env python

from __future__ import division
import cottonmouth.html as hiccup
import argparse
import jsonschema
import json
import pprint
import uuid
import traceback
import warnings
import ete3
import functools as fun
import sys
import os
import yaml


SCHEMA_VERSION = "1.0.0"

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

def get_in(d, path):
    return d if len(path) == 0 else get_in(d.get(path[0]) if isinstance(d, dict) else {}, path[1:])

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
    # QUESTION not sure if we actually want nullable here...
    return dict(description=(desc or "Number of times sequence was observed in the sample. AIRR: see duplicate_count, consensus_count"), type=["integer", "null"], minimum=0)


ident_spec = {
    "description": "UUID specific to the given object",
    "type": "string"}

build_spec = {
    "description": "Information about how a dataset was built. AIRR: see DataProcessing",
    "type": "object",
    "required": ["commit"],
    "title": "Build info",
    "properties": {
      "commit": {
        "description": "Commit sha of whatever build system you used to process the data",
        "type": "string"},
      "time": {
        "description": "Time at which build was initiated",
        "type": "string"}}}


timepoint_multiplicity_spec = {
    "description": "Multiplicity at a specific time. AIRR: ?",
    "type": "object",
    "properties": {
        "timepoint_id": {
            "description": "Id associated with the timepoint in question",
            "type": "string"},
        "multiplicity": multiplicity_spec("Number of times sequence was observed at the given timepoint")}}

sample_spec = {
        "title": "Sample",
        "description": "A sample is generally a collection of sequences.",
        "type": "object",
        "required": ["locus"],
        "properties": {
            "ident": ident_spec,
            "id": id_spec("Sample id"),
            "timepoint_id": {
                "description": "Timepoint associated with this sample (may choose \"merged\" if data has" +
                    " been combined from multiple timepoints)",
                "type": "string"},
            "locus": {
                "description": "B-cell Locus.",
                "type": "string"}}}

subject_spec = {
        "title": "Subject",
        "description": "Subject from which the clonal family was sampled.",
        "type": "object",
        "required": ["id"],
        "properties": {
            "ident": ident_spec,
            "id": id_spec("Subjectd id")}}
    # TODO need to clean this up as well; probably doesn't need to be specified like this

seed_spec = {
        "title": "Seed",
        "description": "A sequence of interest among other clonal family members. AIRR: ?",
        # QUESTION not sure if we actually want nullable here...
        "type": ["object", "null"],
        "required": ["id"],
        "properties": {
            "ident": ident_spec,
            "id": id_spec("Seed id")}}

node_spec = {
    "title": "Node",
    "description": "Information about the phylogenetic tree nodes and the sequences they represent",
    "type": "object",
    "required": ["sequence_id", "sequence", 'sequence_aa'],
    "properties": {
        "sequence_id": id_spec("Sequence id."),
        "sequencedna_seq": {
            "description": "Literal nucleotide sequence, aligned to other sequences in clonal family.",
            # add pattern matching for AGCT-* etc?
            "type": "string"},
        # Would be nice if we translated for users, but can't really do that without removing gaps and
        # realigning, which is assuming a lot
        "sequence_aa": {
            "description": "Literal amino acid sequence, aligned to other sequences in clonal family.",
            # add pattern matching for AGCT-* etc?
            "type": "string"},
        "timepoint_id": {
            "description": "Timepoint associated with sequence, if any. AIRR: see collection_time_point_relative",
            # QUESTION not sure if we actually want nullable here...
            "type": ["string", "null"]},
        "multiplicity": multiplicity_spec(),
        "cluster_multiplicity": multiplicity_spec(
            "If clonal family sequences were downsampled by clustering, the cummulative number of times" +
                " sequences in cluster were observed. AIRR: ?"),
        "timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint. AIRR: ?",
            "type": "array",
            "items": timepoint_multiplicity_spec},
        "cluster_timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint, including sequences falling in" +
                " the same cluster if clustering-based downsampling was performed. AIRR: ?",
            "type": "array",
            "items": timepoint_multiplicity_spec},
        # compute:
        # * lbi, lbr? we should have the tree available to do this but need to coordinate with Duncan
        # * aa_seq
        "lbi": {
            "description": "Local branching index. AIRR: no trees in airr",
            "type": ["number", "null"]},
        "lbr": {
            "description": "Local branching rate (derivative of lbi). AIRR: no trees in airr",
            "type": ["number", "null"]},
        "affinity": {
            "description": "Affinity of the antibody for some antigen. Typically inverse dissociation constant k_d in simulation, and inverse ic50 in data. AIRR: no affinity in airr",
            "type": ["number", "null"]}}}



tree_spec = {
    "title": "Tree",
    "description": "Phylogenetic tree and possibly ancestral state reconstruction of sequences in a clonal family. AIRR: no trees in airr",
    "type": "object",
    "required": ["newick", "nodes"],
    "properties": {
        "ident": ident_spec,
        "id": id_spec("tree id"),
        # optional
        "downsampling_strategy": {
            "description": "If applicable, the downsampling method",
            "type": "string"},
        "downsampled_count": {
            "description": "If applicable, the maximum number of sequences kept in the downsampling process",
            "minumum": 3,
            "type": "integer"},
        "newick": {
            "description": "Tree in newick format",
            "type": "string"},
        "nodes": {
            "description": "Nodes in the clonal family tree and corresponding sequences and metadata",
            "type": "array",
            "items": node_spec}
        }}

def natural_number(desc):
    return dict(description=desc, minimum=0, type="integer")

clonal_family_spec = {
    "title": "Clonal Family",
    "description": "Clonal family of sequences deriving from a particular reassortment event",
    "type": "object",
    "required": ["unique_seqs_count", "mean_mut_freq", "v_start", "v_end", "j_start", "j_end"],
    "properties": {
        "id": id_spec("Clonal family id. AIRR: see clone_id, rearrangement_id"),
        "ident": ident_spec,
        "unique_seqs_count": {
            "description": "Number of unique sequences in the clonal family. AIRR: ?",
            "minimum": 1,
            "type": "integer"},
        "total_read_count": {
            "description": "Number of total reads represented by sequences in the clonal family. AIRR: ?",
            "minimum": 1,
            "type": "integer"},
        # do we currently compute this pre downsampling or what? account for multiplicity?
        "mean_mut_freq": {
            "description": "Mean mutation frequency across sequences in the clonal family. AIRR: ?",
            "minimum": 0,
            "type": "number"},
        "naive_seq": {
            "description": "Naive nucleotide sequence. AIRR: see germline_alignment",
            "type": "string"},
        "has_seed": {
            "description": "Does this clonal family have a seed sequence in it?. AIRR: ?",
            "type": "boolean"},
        # Rearrangement data
        "v_start": natural_number("Position in v gene at which rearrangement starts. AIRR: see v_germline_start, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "v_end": natural_number("Position in v gene at which rearrangement ends. AIRR: see v_germline_end, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "v_call": {
            "description": "V gene used in rearrangement.",
            "type": "string"},
        "d_start": natural_number("Position in d gene at which rearrangement starts. AIRR: see d_germline_start, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "d_end": natural_number("Position in d gene at which rearrangement ends. AIRR: see d_germline_end, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "d_call": {
            "description": "D gene used in rearrangement.",
            "type": "string"},
        "j_start": natural_number("Position in j gene at which rearrangement starts. AIRR: see j_germline_start, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "j_end": natural_number("Position in j gene at which rearrangement ends. AIRR: see j_germline_end, which uses 1-based closed interval as opposed to 0-based python slice convention intervals used by partis."),
        "j_call": {
            "description": "J gene used in rearrangement.",
            "type": "string"},
        "junction_length": natural_number("Length of CDR3 region including both conserved codons in their entirety."),
        "cdr3_start": natural_number("Start of the CDR3 region. From partis \"zero-indexed indel-reversed-sequence positions of the conserved cyst and tryp/phen codons\". AIRR: see cdr3_start, which excludes the conserved residue and uses a \"1-based closed interval\""),
        "sample_id": {
            "description": "sample id associated with this clonal family.",
            "type": "string"},
        "subject_id": {
            "description": "Id of subject from which the clonal family was sampled.",
            "type": "string"},
        "seed_id": {
            "description": "Seed sequence id if any. AIRR: ?",
            "type": ["string", "null"]},
        "trees": {
            "description": "Phylogenetic trees, and possibly ancestral sequence reconstructions. AIRR: ?",
            "type": "array",
            "items": tree_spec}}}
        # leaving out for now
        # 'partition': ['ident', 'id', 'logprob', 'step'],
        # 'v_per_gene_support': ['ident', 'gene', 'prob'],
        # 'd_per_gene_support': ['ident', 'gene', 'prob'],
        # 'j_per_gene_support': ['ident', 'gene', 'prob'],

dataset_spec = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://olmstedviz.org/input.schema.json",
    "title": "Olmsted Dataset",
    "description": "Olmsted dataset input file. AIRR: see Study",
    "type": "object",
    "required": ["id", "clonal_families"],
    "properties": {
        "ident": ident_spec,
        "id": {
            "description": "Unique identifier for a collection of data",
            "type": "string"},
        "build": build_spec,
        "samples": {
            "description": "Information about each of the samples",
            "type": "array",
            "items": sample_spec}, 
        "subjects": {
            "description": "Information about each of the subjects",
            "type": "array",
            "items": subject_spec}, 
        "seeds": {
            "description": "Information about each of the seed sequences",
            "type": "array",
            "items": seed_spec}, 
        "clonal_families": {
            "description": "Information about each of the clonal families",
            "type": "array",
            "items": clonal_family_spec}}}

# Should update to get draft7?
dataset_schema = jsonschema.Draft4Validator(dataset_spec)

def ensure_ident(record):
    "Want to let people choose their own uuids if they like, but not require them to"
    return record if record.get('ident') else merge(record, {'ident': uuid.uuid4()})



# reroot the tree on node matching regex pattern.
# Usually this is used to root on the naive germline sequence
# NOTE duplicates fcn in plot_tree.py
def reroot_tree(args, tree):
    # find naive node
    node = tree.search_nodes(name=args.naive_name)[0]
    # if equal, then the root is already the naive, so done
    if tree != node:
        # In general this would be necessary, but we are actually assuming that naive has been set as an
        # outgroup in dnaml, and if it hasn't, we want to raise an error, as below
        tree.set_outgroup(node)
        # This actually assumes the `not in` condition above, but we check as above for clarity
        tree.remove_child(node)
        node.add_child(tree)
        tree.dist = node.dist

        # TODO Verify that this makes sense, generally speaking; I'm guessing this is how things come out of
        # set_outgroup (with 0 branch length leading up to), but want to make sure.
        node.dist = 0
        tree = node
    return tree


def process_tree_nodes(args, tree, nodes):
    tree = reroot_tree(args, tree)
    node_dict = {n['id']: n for n in nodes}
    def process_node(node):
        datum = node_dict.get(node.name, {})
        datum['type'] = 'leaf' if node.is_leaf() else 'node'
        datum.update(node_dict.get(node.name, {}))
        if node.up:
            datum['parent'] = node.up.name
            datum['length'] = node.get_distance(node.up)
            datum['distance'] = node.get_distance(args.naive_name)
        else:
            # node is root
            datum['type'] = "root"
            datum['parent'] = None
            datum['length'] = 0.0
            datum['distance'] = 0.0
        return datum
    return map(process_node, tree.traverse('postorder'))


def process_tree(args, tree):
    ete_tree = ete3.PhyloTree(tree['newick'], format=1)
    tree['nodes'] = process_tree_nodes(args, ete_tree, tree['nodes'])
    return ensure_ident(tree)


def process_clonal_family(args, dataset, clonal_family):
    # need to cretae a copy of the dataset without clonal families that we can nest under clonal family for
    # viz convenience
    _dataset = dataset.copy()
    del _dataset['clonal_families']
    clonal_family['dataset'] = _dataset
    clonal_family['sample'] = filter(lambda sample: sample['id'] == clonal_family['sample_id'], clonal_family['dataset']['samples'])[0]
    del clonal_family['dataset']['samples']
    # prepare tree(s)
    clonal_family['trees'] = map(fun.partial(process_tree, args), clonal_family.get('trees', []))
    clonal_family['naive'] = args.naive_name
    return ensure_ident(clonal_family)

def process_dataset(dataset):
    dataset['clonal_families_count'] = len(dataset['clonal_families'])
    dataset['subjects_count'] = len(set(cf['subject_id'] for cf in dataset['clonal_families']))
    dataset['timepoints_count'] = len(set(sample['timepoint_id'] for sample in dataset['samples']))
    return ensure_ident(dataset)


def json_rep(x):
    if isinstance(x, uuid.UUID):
        return str(x)
    else:
        return list(x)


def write_out(data, dirname, filename, args):
    if not os.path.exists(dirname):
        os.makedirs(dirname)
    full_path = os.path.normpath(os.path.join(dirname, filename))
    with open(full_path, 'w') as fh:
        print('writing '+ full_path)
        # Then assume json
        json.dump(data, fh, default=json_rep,
            indent=4,
            #allow_nan=False
            )


def hiccup_rep(schema, depth=1, property=None):
    depth = min(depth, 2)
    style = merge({"padding-left": 10, "margin-left": 25, 'margin-top': 10},
                  {"border-left-style": "solid", "border-color": "grey", 'margin-top': 40}
                  if depth == 1 or schema['type'] == 'object' else {})

    return ["div", {"style": style},
            ["h"+str(depth), schema.get('title')] if schema.get('title') else '',
            ["p",
                ['b', "Description: "],
                schema.get('description')] if schema.get('description') else '',
            ["p",
                ['b', "Required: "],
                ["code", str(schema.get('required'))]] if schema.get('required') else '',
            ["p",
                ['b', "Type: "],
                ['code', str(schema.get('type'))]] if schema.get('type') else '',

            ["div",
                ["h"+str(depth+1), "Properties:"]] +
            [["div", {"style": {"margin-left": "10px"}},
                ["h3", ["code", k]],
                # Assume val is either a title, as produced in hiccup_rep2, or an actual schema
                ["b", {'style': {'padding-left': 15, 'font-size': 18}}, "{", val, "}"]
                    if isinstance(val, str)
                    else hiccup_rep(val, depth=depth+1)]
                for k, val in schema.get('properties').items()] if schema.get('properties') else '',
            
            ["div",
                ["h"+str(depth+1), "Array Items:"],
                # As above, assume and display a title if string, otherwise recurse
                ["b", {'style': {'padding-left': 15, 'font-size': 18}}, "{", schema['items'], "}"]
                    if isinstance(schema.get('items'), str)
                    else hiccup_rep(schema.get('items'), depth=depth+1)]
                if schema.get('items') else '']



def hiccup_rep2(schema):
    def flatten_schema_by_title(schema):
        items_schemas, properties_schemas = [], []
        items = schema.get('items')
        # if this is an array, check title
        if items and items.get('title'):
            schema['items'] = items['title']
            items_schemas = flatten_schema_by_title(items)
        for key, subschema in schema.get('properties', {}).items():
            # handle case of being a single reference, with a title
            title = subschema.get('title')
            if title:
                properties_schemas += flatten_schema_by_title(subschema)
                schema['properties'][key] = title
            # handle array/items case
            items = subschema.get('items')
            if items and items.get('title'):
                properties_schemas += flatten_schema_by_title(items)
                subschema['items'] = items['title']
        return [schema] + items_schemas + properties_schemas

    return ["div",
            map(hiccup_rep, flatten_schema_by_title(schema))]



def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument('-i', '--inputs', nargs='+')
    parser.add_argument('-o', '--data-outdir',
            help="directory in which data will be saved; required for data output")
    parser.add_argument('-n', '--naive-name', default='naive')
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('-S', '--display-schema-html')
    parser.add_argument('-s', '--display-schema', action="store_true",
            help="print schema to stdout for display")
    parser.add_argument('-y', '--write-schema-yaml', action="store_true",
            help="write the schema to a yaml format file.")
    return parser.parse_args()



def main():
    args = get_args()
    datasets, clonal_families_dict, trees = [], {}, []

    for infile in args.inputs or []:
        print("\nProcessing infile: {}".format(str(infile)))
        try:
            with open(infile, 'r') as fh:
                dataset = json.load(fh)
                if dataset_schema.is_valid(dataset):
                    dataset = process_dataset(dataset)
                    clonal_families = map(fun.partial(process_clonal_family, args, dataset), dataset['clonal_families'])
                    trees += reduce(lambda agg_trees, cf: agg_trees + cf['trees'],
                            clonal_families, [])
                    for cf in clonal_families:
                        cf['trees'] = [
                                dict_subset(tree, ['downsampling_strategy', 'ident', 'type', 'id', 'downsampled_count'])
                                for tree in cf['trees']]
                    clonal_families_dict[dataset['id']] = clonal_families
                    del dataset['clonal_families']
                    dataset['schema_version'] = SCHEMA_VERSION
                    datasets.append(dataset)
                else:
                    message = "Dataset doesn't conform to spec." + "" if args.verbose else " Please rerunn with `-v` for detailed errors"
                    print(message)
                    if args.verbose:
                        last_error_path = None
                        for error in dataset_schema.iter_errors(dataset):
                            error_path = list(error.path)
                            if last_error_path != error_path:
                                print("  Error at " + str(error_path) + ":")
                                last_error_path = error_path
                            print("    " + error.message)
                            # import pdb; pdb.set_trace()
        except Exception as e:
            message = "Unable to process infile: " + str(infile) + "" if args.verbose else " Please rerunn with `-v` for detailed errors"
            print(message)
            if args.verbose:
                exc_info = sys.exc_info()
                traceback.print_exception(*exc_info)

    if args.write_schema_yaml:
        with open('schema.yaml', 'w') as yamlf:
            yaml.dump(dataset_spec, yamlf)
    if args.display_schema:
        pprint.pprint(dataset_spec)
    if args.display_schema_html:
        with open(args.display_schema_html, 'w') as fh:
            fh.write(hiccup.render(
                ["html",
                    ["body",
                        hiccup_rep2(dataset_spec),
                        # hiccup_rep(dataset_spec)
                        ]]))
    # write out data
    if args.data_outdir:
        write_out(datasets, args.data_outdir, 'datasets.json', args)
        for dataset_id, clonal_families in clonal_families_dict.items():
            write_out(clonal_families, args.data_outdir + '/', 'clonal_families.' + dataset_id + '.json' , args)
        for tree in trees:
            write_out(tree, args.data_outdir + '/', 'tree.' + tree['ident'] + '.json' , args)


if __name__ == '__main__':
    main()




