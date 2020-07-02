#!/usr/bin/env python

from __future__ import division
from collections import OrderedDict
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
import ntpl

SCHEMA_VERSION = "2.0.0"

# Some generic data processing helpers helpers


def comp(f, g):
    def h(*args, **kw_args):
        return f(g(*args, **kw_args))

    return h


def strip_ns(a):
    return a.split(":")[-1]


def dict_subset(d, keys):
    return {k: d[k] for k in keys if k in d}


def merge(d, d2):
    d = d.copy()
    d.update(d2)
    return d


def get_in(d, path):
    return (
        d
        if len(path) == 0
        else get_in(d.get(path[0]) if isinstance(d, dict) else {}, path[1:])
    )


inf = float("inf")
neginf = float("-inf")


def clean_record(d):
    if isinstance(d, list):
        return map(clean_record, d)
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


# Pulling datasets information out


# OK; Here's what we're going to do.

# We want constructors which describe the space of attrs we're talking about here.


def id_spec(desc=None):
    return dict(description=(desc or "Identifier"), type="string")


def multiplicity_spec(desc=None):
    # QUESTION not sure if we actually want nullable here...
    return dict(
        description=(desc or "Number of times sequence was observed in the sample."),
        type=["integer", "null"],
        minimum=0,
    )


ident_spec = {"description": "UUID specific to the given object", "type": "string"}

build_spec = {
    "description": "Information about how a dataset was built.",
    "type": "object",
    "required": ["commit"],
    "title": "Build info",
    "properties": {
        "commit": {
            "description": "Commit sha of whatever build system you used to process the data",
            "type": "string",
        },
        "time": {"description": "Time at which build was initiated", "type": "string"},
    },
}


timepoint_multiplicity_spec = {
    "title": "Timepoint multiplicity",
    "description": "Multiplicity at a specific time.",
    "type": "object",
    "properties": {
        "timepoint_id": {
            "description": "Id associated with the timepoint in question",
            "type": "string",
        },
        "multiplicity": multiplicity_spec(
            "Number of times sequence was observed at the given timepoint"
        ),
    },
}

sample_spec = {
    "title": "Sample",
    "description": "A sample is generally a collection of sequences.",
    "type": "object",
    "required": ["locus"],
    "properties": {
        "ident": ident_spec,
        "sample_id": id_spec("Sample id"),
        "timepoint_id": {
            "description": 'Timepoint associated with this sample (may choose "merged" if data has'
            + " been combined from multiple timepoints)",
            "type": "string",
        },
        "locus": {"description": "B-cell Locus.", "type": "string"},
    },
}

subject_spec = {
    "title": "Subject",
    "description": "Subject from which the clonal family was sampled.",
    "type": "object",
    "required": ["subject_id"],
    "properties": {"ident": ident_spec, "subject_id": id_spec("Subject id")},
}

seed_spec = {
    # TODO https://github.com/matsengrp/olmsted/commit/4992ac4af5be0ef1d12034de37666c6cf7258988#r32297022
    "title": "Seed",
    "description": "A sequence of interest among other clonal family members.",
    # QUESTION not sure if we actually want nullable here...
    "type": ["object", "null"],
    "required": ["seed_id"],
    "properties": {"ident": ident_spec, "seed_id": id_spec("Seed id")},
}

node_spec = {
    "title": "Node",
    "description": "Information about the phylogenetic tree nodes and the sequences they represent",
    "type": "object",
    "required": ["sequence_id", "sequence_alignment", "sequence_alignment_aa"],
    "properties": {
        "sequence_id": id_spec(
            "AIRR: Identifier for this node that matches the id in the newick string and, where possible, the sequence_id in the source repertoire."
        ),
        "sequence_alignment": {
            "description": "AIRR: Nucleotide sequence of the node, aligned to the germline_alignment for this clone, including any indel corrections or spacers.",
            # add pattern matching for AGCT-* etc?
            "type": "string",
        },
        "sequence_alignment_aa": {
            "description": "Amino acid sequence of the node, aligned to the germline_alignment for this clone, including any indel corrections or spacers.",
            # add pattern matching for AGCT-* etc?
            "type": "string",
        },
        "timepoint_id": {
            "description": "Timepoint associated with sequence, if any.",
            # QUESTION not sure if we actually want nullable here...
            "type": ["string", "null"],
        },
        "multiplicity": multiplicity_spec(),
        "cluster_multiplicity": multiplicity_spec(
            "If clonal family sequences were downsampled by clustering, the cummulative number of times"
            + " sequences in cluster were observed."
        ),
        "timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint.",
            "type": "array",
            "items": timepoint_multiplicity_spec,
        },
        "cluster_timepoint_multiplicities": {
            "description": "Sequence multiplicity, broken down by timepoint, including sequences falling in"
            + " the same cluster if clustering-based downsampling was performed.",
            "type": "array",
            "items": timepoint_multiplicity_spec,
        },
        "lbi": {"description": "Local branching index.", "type": ["number", "null"]},
        "lbr": {
            "description": "Local branching rate (derivative of lbi).",
            "type": ["number", "null"],
        },
        "affinity": {
            "description": "Affinity of the antibody for some antigen. Typically inverse dissociation constant k_d in simulation, and inverse ic50 in data.",
            "type": ["number", "null"],
        },
    },
}


tree_spec = {
    "title": "Tree",
    "description": "Phylogenetic tree and possibly ancestral state reconstruction of sequences in a clonal family.",
    "type": "object",
    "required": ["newick", "nodes"],
    "properties": {
        "ident": ident_spec,
        "tree_id": id_spec("AIRR: Identifier for the tree."),
        "clone_id": id_spec("AIRR: Identifier for the clone."),
        "downsampling_strategy": {
            "description": "If applicable, the downsampling method",
            "type": "string",
        },
        "downsampled_count": {
            "description": "If applicable, the maximum number of sequences kept in the downsampling process",
            "minumum": 3,
            "type": "integer",
        },
        "newick": {
            "description": "AIRR: Newick string of the tree edges.",
            "type": "string",
        },
        "nodes": {
            "description": "AIRR: Dictionary of nodes in the tree, keyed by sequence_id string.",
            "type": "object",
            "additionalProperties": node_spec,
        },
    },
}


def natural_number(desc):
    return dict(description=desc, minimum=0, type="integer")


clone_spec = {
    "title": "Clone",
    "description": "Clonal family of sequences deriving from a particular reassortment event",
    "type": "object",
    "required": [
        "unique_seqs_count",
        "mean_mut_freq",
        "v_alignment_start",
        "v_alignment_end",
        "j_alignment_start",
        "j_alignment_end",
    ],
    "properties": {
        "clone_id": id_spec("AIRR: Identifier for the clone."),
        "ident": ident_spec,
        "unique_seqs_count": {
            "description": "Number of unique sequences in the clone",
            "minimum": 1,
            "type": "integer",
        },
        "total_read_count": {
            "description": "Number of total reads represented by sequences in the clone.",
            "minimum": 1,
            "type": "integer",
        },
        # do we currently compute this pre downsampling or what? account for multiplicity?
        "mean_mut_freq": {
            "description": "Mean mutation frequency across sequences in the clone.",
            "minimum": 0,
            "type": "number",
        },
        "germline_alignment": {
            "description": "AIRR: Assembled, aligned, full-length inferred ancestor of the clone spanning the same region as the sequence_alignment field of nodes (typically the V(D)J region) and including the same set of corrections and spacers (if any).",
            "type": "string",
        },
        "has_seed": {
            "description": "Does this clone have a seed sequence in it?",
            "type": "boolean",
        },
        # Rearrangement data
        "v_alignment_start": natural_number(
            "AIRR: Start position in the V segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "v_alignment_end": natural_number(
            "AIRR: End position in the V segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "v_call": {
            "description": "AIRR: V gene with allele of the inferred ancestral of the clone. For example, IGHV4-59*01.",
            "type": "string",
        },
        "d_alignment_start": natural_number(
            "AIRR: Start position of the D segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "d_alignment_end": natural_number(
            "AIRR: End position of the D segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "d_call": {
            "description": "AIRR: D gene with allele of the inferred ancestor of the clone. For example, IGHD3-10*01.",
            "type": "string",
        },
        "j_alignment_start": natural_number(
            "AIRR: Start position of the J segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "j_alignment_end": natural_number(
            "AIRR: End position of the J segment in both the sequence_alignment and germline_alignment fields (1-based closed interval)."
        ),
        "j_call": {
            "description": "AIRR: J gene with allele of the inferred ancestor of the clone. For example, IGHJ4*02.",
            "type": "string",
        },
        "junction_length": natural_number(
            "AIRR: Number of nucleotides in the junction. (see AIRR 'junction': Nucleotide sequence for the junction region of the inferred ancestor of the clone, where the junction is defined as the CDR3 plus the two flanking conserved codons.)"
        ),
        "junction_start": natural_number(
            "AIRR: Junction region start position in the alignment (1-based closed interval)."
        ),
        "sample_id": {
            "description": "sample id associated with this clonal family.",
            "type": "string",
        },
        "subject_id": {
            "description": "Id of subject from which the clonal family was sampled.",
            "type": "string",
        },
        "seed_id": {
            "description": "Seed sequence id if any.",
            "type": ["string", "null"],
        },
        "trees": {
            "description": "Phylogenetic trees, and possibly ancestral sequence reconstructions.",
            "type": "array",
            "items": tree_spec,
        },
    },
}

dataset_spec = {
    "$schema": "https://json-schema.org/draft-07/schema#",
    "$id": "https://olmstedviz.org/input.schema.json",
    "title": "Olmsted Dataset",
    "description": "Olmsted dataset input file.",
    "type": "object",
    "required": ["dataset_id", "clones"],
    "properties": {
        "ident": ident_spec,
        "dataset_id": {
            "description": "Unique identifier for a collection of data",
            "type": "string",
        },
        "build": build_spec,
        "samples": {
            "description": "Information about each of the samples",
            "type": "array",
            "items": sample_spec,
        },
        "subjects": {
            "description": "Information about each of the subjects",
            "type": "array",
            "items": subject_spec,
        },
        "seeds": {
            "description": "Information about each of the seed sequences",
            "type": "array",
            "items": seed_spec,
        },
        "clones": {
            "description": "Information about each of the clonal families",
            "type": "array",
            "items": clone_spec,
        },
        "paper": {
            "description": "Information about a paper corresponding to this dataset",
            "type": "object",
            "required": ["authorstring"],
            "title": "Paper info",
            "properties": {
                "url": {
                    "description": "Link to online version of the paper.",
                    "type": "string",
                },
                "authorstring": {
                    "description": 'String to be displayed citing authors, e.g. "Doe, et. al.".',
                    "type": "string",
                },
            },
        },
    },
}


def is_nullable_string(checker, instance):
    return jsonschema.Draft4Validator.TYPE_CHECKER.is_type(
        instance, "string"
    ) or jsonschema.Draft4Validator.TYPE_CHECKER.is_type(instance, "null")


type_checker = jsonschema.Draft4Validator.TYPE_CHECKER.redefine(
    "string", is_nullable_string
)
CustomValidator = jsonschema.validators.extend(
    jsonschema.Draft4Validator, type_checker=type_checker
)

# Should update to get draft7?
olmsted_dataset_schema = jsonschema.Draft4Validator(dataset_spec)
airr_clone_schema = None
with open("airr-standards/specs/airr-schema.yaml") as stream:
    airr_clone_schema_dict = yaml.load(stream).get("Clone")
    airr_clone_schema = CustomValidator(airr_clone_schema_dict)


def validate(data, schema, verbose=False, object_name=None):
    if not schema.is_valid(data):
        msg = "{} doesn't conform to spec.".format(
            object_name if object_name is not None else "Input data"
        )
        if verbose:
            last_error_path = None
            for error in schema.iter_errors(data):
                error_path = list(error.path)
                if last_error_path != error_path:
                    print("  Error at " + str(error_path) + ":")
                    last_error_path = error_path
                print("    " + error.message)
            msg += " See above for detailed errors."
        else:
            msg += "Please rerun with `-v` for detailed errors"
        raise Exception(msg)


def ensure_ident(record):
    "Want to let people choose their own uuids if they like, but not require them to"
    return record if record.get("ident") else merge(record, {"ident": uuid.uuid4()})


# reroot the tree on node matching regex pattern.
# Usually this is used to root on the naive germline sequence
# NOTE duplicates fcn in plot_tree.py
# TODO this is just one way to "reroot" trees; it's worth considering removing this function from the script so that we are not responsible for this job since it isn't trivial (e.g. if given an unrooted tree, ete3.Tree.set_outgroup will add an empty-string-named taxon)
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

        node.dist = 0
        tree = node
    return tree


def process_tree_nodes(args, tree, nodes, reroot=False):
    if reroot:
        tree = reroot_tree(args, tree)

    def process_node(node):
        datum = nodes.get(node.name, {})
        datum["type"] = "leaf" if node.is_leaf() else "node"
        datum.update(nodes.get(node.name, {}))
        if node.up:
            datum["parent"] = node.up.name
            datum["length"] = node.get_distance(node.up)
            datum["distance"] = node.get_distance(args.naive_name)
        else:
            # node is root
            datum["type"] = "root"
            datum["parent"] = None
            datum["length"] = 0.0
            datum["distance"] = 0.0
        return datum

    return map(process_node, tree.traverse("postorder"))


def process_tree(args, clone_id, tree):
    # add clone_id to satisfy AIRR schema
    tree["clone_id"] = clone_id
    ete_tree = ete3.PhyloTree(tree["newick"], format=1)
    tree["nodes"] = process_tree_nodes(
        args, ete_tree, tree["nodes"], reroot=args.root_trees
    )
    return ensure_ident(tree)


def validate_airr_clone_and_trees(args, clone):
    clone["repertoire_id"] = None
    # prepare tree(s)
    clone["trees"] = map(
        fun.partial(process_tree, args, clone["clone_id"]), clone.get("trees", [])
    )
    validate(clone, airr_clone_schema, verbose=args.verbose, object_name="Clone")


def process_clone(args, dataset, clone):
    validate_airr_clone_and_trees(args, clone)
    # -=1 *_start positions since AIRR schema uses 1-based closed interval but we need python slice conventions (0-based, open interval) for source code (vega visualization). See bin/process_data.py
    for start_pos_key in [
        "v_alignment_start",
        "d_alignment_start",
        "j_alignment_start",
        "junction_start",
    ]:
        clone[start_pos_key] -= 1
    # need to cretae a copy of the dataset without clonal families that we can nest under clonal family for viz convenience
    _dataset = dataset.copy()
    del _dataset["clones"]
    clone["dataset"] = _dataset
    clone["sample"] = filter(
        lambda sample: sample["sample_id"] == clone["sample_id"],
        clone["dataset"]["samples"],
    )[0]
    del clone["dataset"]["samples"]
    return ensure_ident(clone)


def process_dataset(args, dataset, clones_dict, trees):
    dataset["clone_count"] = len(dataset["clones"])
    dataset["subjects_count"] = len(set(cf["subject_id"] for cf in dataset["clones"]))
    dataset["timepoints_count"] = len(
        set(sample["timepoint_id"] for sample in dataset["samples"])
    )
    clones = map(fun.partial(process_clone, args, dataset), dataset["clones"])
    trees += reduce(lambda agg_trees, cf: agg_trees + cf["trees"], clones, [])
    for cf in clones:
        cf["trees"] = [
            dict_subset(tree, set(tree.keys()) - {"nodes"}) for tree in cf["trees"]
        ]
    clones_dict[dataset["dataset_id"]] = clones
    del dataset["clones"]
    dataset["schema_version"] = SCHEMA_VERSION
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
    with open(full_path, "w") as fh:
        print("writing " + full_path)
        # Then assume json
        json.dump(
            data,
            fh,
            default=json_rep,
            indent=4,
            # allow_nan=False
        )


def hiccup_rep(schema, depth=1, property=None):
    depth = min(depth, 2)
    if depth == 1 or schema["type"] == "object":
        style = "padding-left: 10;"+\
                "margin-left: 25;"+\
                "margin-top: 40;"+\
                "border-left-style: solid;"+\
                "border-color: grey;"
    else:
        style = "padding-left: 10;"+\
                "margin-left: 25;"+\
                "margin-top: 10;"
    return [
        "div",
        {"style": style},
        ["h" + str(depth), schema.get("title")] if schema.get("title") else "",
        ["p", ["b", "Description: "], ["span", schema.get("description")]]
        if schema.get("description")
        else "",
        ["p", ["b", "Required: "], ["code", str(schema.get("required"))]]
        if schema.get("required")
        else "",
        ["p", ["b", "Type: "], ["code", str(schema.get("type"))]]
        if schema.get("type")
        else "",
        ["div", ["h" + str(depth + 1), "Properties:"]]
        + [
            [
                "div",
                {"style": "margin-left: 10px;"},
                ["h3", ["code", k]],
                # Assume val is either a title, as produced in hiccup_rep2, or an actual schema
                ["b", {"style": "padding-left: 15; font-size: 18;"}, "{%s}"%val]
                if isinstance(val, str)
                else hiccup_rep(val, depth=depth + 1),
            ]
            for k, val in schema.get("properties").items()
        ]
        if schema.get("properties")
        else "",
        [
            "div",
            ["h" + str(depth + 1), "Array Items:"],
            # As above, assume and display a title if string, otherwise recurse
            [
                "b",
                {"style": "padding-left: 15; font-size: 18;"},
                "{%s}"%schema["items"],
            ]
            if isinstance(schema.get("items"), str)
            else hiccup_rep(schema.get("items"), depth=depth + 1),
        ]
        if schema.get("items")
        else "",
        [
            "div",
            ["h" + str(depth + 1), "Object with values of type:"],
            # As above, assume and display a title if string, otherwise recurse
            [
                "b",
                {"style": "padding-left: 15; font-size: 18;"},
                "{%s}"%schema["additionalProperties"],
            ]
            if isinstance(schema.get("additionalProperties"), str)
            else hiccup_rep(schema.get("additionalProperties"), depth=depth + 1),
        ]
        if schema.get("additionalProperties")
        else "",
    ]


def hiccup_rep2(schema):
    def flatten_schema_by_title(schema):
        items_schemas, properties_schemas = [], []
        items = schema.get("items")
        # if this is an array, check title
        if items and items.get("title"):
            schema["items"] = items["title"]
            items_schemas = flatten_schema_by_title(items)
        #object
        additionalProperties = schema.get("additionalProperties")
        if additionalProperties and additionalProperties.get("title"):
            schema["additionalProperties"] = additionalProperties["title"]
            items_schemas = flatten_schema_by_title(additionalProperties)
        for key, subschema in schema.get("properties", {}).items():
            # handle case of being a single reference, with a title
            title = subschema.get("title")
            if title:
                properties_schemas += flatten_schema_by_title(subschema)
                schema["properties"][key] = title
            # handle array/items case
            items = subschema.get("items")
            if items and items.get("title"):
                properties_schemas += flatten_schema_by_title(items)
                subschema["items"] = items["title"]
            #object
            additionalProperties = subschema.get("additionalProperties")
            if additionalProperties and additionalProperties.get("title"):
                properties_schemas += flatten_schema_by_title(additionalProperties)
                subschema["additionalProperties"] = additionalProperties["title"]
        return OrderedDict([(schema["title"], schema) for schema in [schema] + items_schemas + properties_schemas]).values()
    return ["div", map(hiccup_rep, flatten_schema_by_title(schema))]


def get_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("-i", "--inputs", nargs="+")
    parser.add_argument(
        "-o",
        "--data-outdir",
        help="directory in which data will be saved; required for data output",
    )
    parser.add_argument("-n", "--naive-name", default="naive")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument(
        "-c",
        "--remove-invalid-clones",
        action="store_true",
        help="validate clones individually against the olmsted schema, removing the invalid ones and try to build the dataset using the remaining clones. Note that processing can still be crashed by clones which are invalid according to the AIRR clones and trees schema (see airr-standards/specs/airr-schema.yaml).",
    )
    parser.add_argument("-S", "--display-schema-html")
    parser.add_argument(
        "-s",
        "--display-schema",
        action="store_true",
        help="print schema to stdout for display",
    )
    parser.add_argument(
        "-y",
        "--write-schema-yaml",
        action="store_true",
        help="write the schema to a yaml format file.",
    )
    parser.add_argument(
        "-r", "--root-trees", action="store_true", help="Root trees using --naive-name."
    )
    return parser.parse_args()


def main():
    args = get_args()
    datasets, clones_dict, trees = [], {}, []
    for infile in args.inputs or []:
        print("\nProcessing infile: {}".format(str(infile)))
        try:
            with open(infile, "r") as fh:
                dataset = json.load(fh)
                if args.remove_invalid_clones:
                    dataset["clones"] = filter(
                        jsonschema.Draft4Validator(clone_spec).is_valid,
                        dataset["clones"],
                    )
                validate(
                    dataset,
                    olmsted_dataset_schema,
                    verbose=args.verbose,
                    object_name="Dataset",
                )
                # Process the dataset, including validation of clones, trees against the AIRR schema
                dataset = process_dataset(args, dataset, clones_dict, trees)
                datasets.append(dataset)
        except Exception as e:
            print("Unable to process infile: {}".format(infile))
            if args.verbose:
                exc_info = sys.exc_info()
                traceback.print_exception(*exc_info)
            else:
                print("Please rerun with `-v` for detailed errors.")
            sys.exit(1)
    # write out schema
    if args.write_schema_yaml:
        with open("schema.yaml", "w") as yamlf:
            yaml.dump(dataset_spec, yamlf)
    if args.display_schema:
        pprint.pprint(dataset_spec)
    if args.display_schema_html:
        with open(args.display_schema_html, "w") as fh:
            fh.write(
                ntpl.render(
                    [
                        "html",
                        [
                            "body",
                            hiccup_rep2(dataset_spec),
                        ],
                    ]
                )
            )
    # write out data
    if args.data_outdir:
        write_out(datasets, args.data_outdir, "datasets.json", args)
        for dataset_id, clones in clones_dict.items():
            write_out(
                clones, args.data_outdir + "/", "clones." + dataset_id + ".json", args
            )
        for tree in trees:
            write_out(
                tree, args.data_outdir + "/", "tree." + tree["ident"] + ".json", args
            )


if __name__ == "__main__":
    main()
