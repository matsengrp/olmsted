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
    return dict(description=(desc or "Number of times sequence was observed in the sample"), type=["integer", "null"], minimum=0)


ident_spec = {
    "description": "UUID specific to the given object",
    "type": "string"}

build_spec = {
    "description": "Information about how a dataset was built",
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
    "description": "Multiplicity at a specific time",
    "type": "object",
    "properties": {
        # TODO timepoint_id?
        "timepoint_id": {
            "description": "Id associated with the timepoint in question",
            "type": "string"},
        "multiplicity": multiplicity_spec("Number of times sequence was observed at the given timepoint")}}


sequence_spec = {
    "title": "Sequence & node record",
    "description": "Information about the nucelotide sequence and/or phylogenetic tree node",
    "type": "object",
    "required": ["id", "nt_seq", 'aa_seq'],
    "properties": {
        "id": id_spec("Sequence id"),
        "nt_seq": {
            "description": "Literal nucleotide sequence, aligned to other sequences in clonal family",
            # add pattern matching for AGCT-* etc?
            "type": "string"},
        # Would be nice if we translated for users, but can't really do that without removing gaps and
        # realigning, which is assuming a lot
        "aa_seq": {
            "description": "Literal amino acid sequence, aligned to other sequences in clonal family",
            # add pattern matching for AGCT-* etc?
            "type": "string"},
        "timepoint": {
            "description": "Timepoint associated with sequence, if any",
            # QUESTION not sure if we actually want nullable here...
            "type": ["string", "null"]},
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
            "description": "Affinity of the antibody for some antigen. Typically inverse dissociation constant k_d in simulation, and inverse ic50 in data.",
            "type": "number"}}}



# Do we want to keep calling these reconstructions? trees?
reconstruction_spec = {
    "title": "Reconstruction",
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
            "type": "integer"},
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
    "title": "Clonal family",
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
            "description": "Mean mutation frequency across sequences in the clonal family",
            "minimum": 0,
            "type": "number"},
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
            "title": "Sample",
            "description": "A sample is generally a collection of sequences",
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
            # QUESTION not sure if we actually want nullable here...
            "type": ["object", "null"],
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

# Should update to get draft7?
dataset_schema = jsonschema.Draft4Validator(dataset_spec)


def ensure_ident(record):
    "Want to let people choose their own uuids if they like, but not require them to"
    return record if record.get('ident') else merge(record, {'ident': uuid.uuid4()})


# TODO We may want to get away from args.inferred_naive_name and go to clonal families having
# their own inferred_naive_name

# reroot the tree on node matching regex pattern.
# Usually this is used to root on the naive germline sequence
# NOTE duplicates fcn in plot_tree.py
def reroot_tree(args, tree):
    # find naive node
    node = tree.search_nodes(name=args.inferred_naive_name)[0]
    # if equal, then the root is already the inferred naive, so done
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


def process_tree(args, tree, sequences):
    tree = reroot_tree(args, tree)
    seq_dict = {seq['id']: seq for seq in sequences}
    def process_node(node):
        datum = seq_dict.get(node.name, {})
        # QUESTION are we even using this?
        datum['type'] = 'leaf' if node.is_leaf() else 'node'
        datum.update(seq_dict.get(node.name, {}))
        if node.up:
            datum['parent'] = node.up.name
            datum['length'] = node.get_distance(node.up)
            datum['distance'] = node.get_distance(args.inferred_naive_name)
        else:
            # node is root
            datum['type'] = "root"
            datum['parent'] = None
            datum['length'] = 0.0
            datum['distance'] = 0.0
        # TODO currently olmsted using label; should probably switch to just using id
        datum['label'] = node.id = node.name
        return datum
    return map(process_node, tree.traverse('postorder'))


def process_reconstruction(args, reconstruction):
    tree = ete3.PhyloTree(reconstruction['newick_tree'], format=1)
    # TODO switch back to tree
    reconstruction['asr_tree'] = process_tree(args, tree, reconstruction['sequences'])
    # Once we've merged into the tree nodes, don't need this anymore
    del reconstruction['sequences']
    return ensure_ident(reconstruction)


def process_clonal_family(args, dataset, clonal_family):
    # need to cretae a copy of the dataset without clonal families that we can nest under clonal family for
    # viz convenience
    _dataset = dataset.copy()
    del _dataset['clonal_families']
    clonal_family['dataset'] = _dataset
    # prepare reconstruction(s)
    clonal_family['reconstructions'] = map(fun.partial(process_reconstruction, args), clonal_family.get('reconstructions', []))
    clonal_family['naive'] = args.inferred_naive_name
    return ensure_ident(clonal_family)

def process_dataset(dataset):
    dataset['n_clonal_families'] = len(dataset['clonal_families'])
    dataset['n_subjects'] = len(set(get_in(cf, ['subject', 'id']) for cf in dataset['clonal_families']))
    dataset['n_timepoints'] = len(set(get_in(cf, ['sample', 'timepoint']) for cf in dataset['clonal_families']))
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
    parser.add_argument('-n', '--inferred-naive-name', default='inferred_naive')
    parser.add_argument('-v', '--verbose', action='store_true')
    parser.add_argument('-S', '--display-schema-html')
    parser.add_argument('-s', '--display-schema', action="store_true",
            help="print schema to stdout for display")
    return parser.parse_args()



def main():
    args = get_args()
    datasets, clonal_families_dict, reconstructions = [], {}, []

    for infile in args.inputs or []:
        print "\nProcessing infile:", str(infile)
        try:
            with open(infile, 'r') as fh:
                dataset = json.load(fh)
                if dataset_schema.is_valid(dataset):
                    dataset = process_dataset(dataset)
                    clonal_families = map(fun.partial(process_clonal_family, args, dataset), dataset['clonal_families'])
                    reconstructions += reduce(lambda recons, cf: recons + cf['reconstructions'],
                            clonal_families, [])
                    for cf in clonal_families:
                        cf['reconstructions'] = [
                                dict_subset(recon, ['prune_strategy', 'ident', 'type', 'id', 'prune_count'])
                                for recon in cf['reconstructions']]
                    clonal_families_dict[dataset['id']] = clonal_families
                    del dataset['clonal_families']
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
        for reconstruction in reconstructions:
            write_out(reconstruction, args.data_outdir + '/', 'reconstruction.' + reconstruction['ident'] + '.json' , args)


if __name__ == '__main__':
    main()




