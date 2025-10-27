import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import * as treesSelector from "../../selectors/trees";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import { concatTreeWithAlignmentSpec } from "./vega/clonalFamilyDetails";
import { getNaiveVizData } from "./naive";
import * as explorerActions from "../../actions/explorer";
import DownloadFasta from "./downloadFasta";
import DownloadText from "../util/downloadText";
import { IncompleteDataWarning } from "../util/incomplete";
import { CollapseHelpTitle } from "../util/collapseHelpTitle";
import { SimpleInProgress } from "../util/loading";

// Tree header component
// =================================
// Describes the tree viz, includes dropdown for selecting trees.
@connect(null, (dispatch) => ({
  dispatchSelectedTree: (treeIdent, selectedFamily, selectedSeq) => {
    dispatch(explorerActions.updateSelectedTree(treeIdent, selectedFamily, selectedSeq));
  }
}))
class TreeHeader extends React.Component {
  render() {
    const { selectedFamily, tree, dispatchSelectedTree, selectedSeq } = this.props;
    return (
      <div>
        <CollapseHelpTitle
          titleText={`Clonal family details for ${selectedFamily.sample_id || selectedFamily.subject_id || "sample"} ${selectedFamily.clone_id}`}
          helpText={
            <div>
              For a selected clonal family, its phylogenetic tree is visualized below the table in the Clonal family
              details section. Select among any alternate phylogenies using the Ancestral reconstruction method menu.
              Note that these ancestral reconstruction methods are according to those specified in the input data
              according to the phylogenetic inference tool used to produce them - Olmsted does not perform ancestral
              reconstruction (or any phylogenetic inference at all).
              <br />
              <br />
              Alongside the tree is an alignment of the sequences at the tree&apos;s tips. Colors indicate amino acid
              mutations at each position that differs from the sequence at the root of the tree (typically the
              family&apos;s inferred naive antibody sequence). Scroll while hovering over the tree to zoom in and out.
              Click and drag the zoomed view to pan in a traditional map-style interface. The alignment view on the
              right zooms in the vertical dimension according to the zoom status of the tree. The tree&apos;s leaves use
              pie charts to show the multiplicity (i.e. the number of downsampled and deduplicated sequences)
              represented by a given sequence, colored according to sampling timepoint. See{" "}
              <a href="http://www.olmstedviz.org/schema.html">the schema</a> for more detailed field descriptions.
              <br />
              <br />
              Note that often in example data the number of sequences in a clonal family has been downsampled to build a
              tree (see downsampled_count, downsampling_strategy in{" "}
              <a href="http://www.olmstedviz.org/schema.html">the schema</a>
              ), which explains why a clonal family might be listed in the table as having a few thousand unique
              sequences, but upon selecting the clonal family, the corresponding tree visualization only contains 10s or
              100s of sequences.
              <br />
              <br />
              Use the interface below the tree to configure:
              <br />
              <ul>
                <li>Maximum width of the tree window with respect to the alignment window (Tree width ratio)</li>
                <li>Field mapped to the size of pie charts at the tree&apos; leaves (leaf_size_by)</li>
                <li>Maximum size of pie charts at the tree&apos; leaves (max_leaf_size)</li>
                <li>Tree tip labels toggle on and off (show_labels)</li>
                <li>
                  Fields mapped to branch width and color (branch_width_by, branch_color_by, branch_color_scheme,
                  min_color_value)
                </li>
              </ul>
              In order to get more details about a particular lineage in the tree, click on a leaf&apos;s label (or on
              the dot at the center of the pie chart) - the Ancestral Sequences section will appear below the tree.
              <br />
              <br />
            </div>
          }
        />

        <div>
          <div>
            <span style={{ marginRight: 8 }}>Ancestral reconstruction method:</span>
            <select
              id="tree-select"
              value={tree.ident}
              onChange={(event) => dispatchSelectedTree(event.target.value, selectedFamily, selectedSeq)}
              aria-label="Ancestral reconstruction method"
            >
              {selectedFamily.trees.map((tree_option) => (
                <option key={tree_option.ident} value={tree_option.ident}>
                  {tree_option.tree_id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    );
  }
}

const isTreeComplete = (tree) => tree.nodes && !tree.nodes.error;

// Phylogenetic tree & alignment viz
// =================================
// We show this for the given selected clonal family and tree (in case there are multiple such
// trees).

// First some redux connection functions

const mapStateToProps = (state) => {
  const selectedFamily = clonalFamiliesSelectors.getSelectedFamily(state);
  const selectedTree = treesSelector.getSelectedTree(state);

  // idea is that none of these selectors will work (or be needed) if tree data isn't in yet
  if (selectedFamily && selectedTree && isTreeComplete(selectedTree)) {
    const naiveData = getNaiveVizData(selectedFamily);

    // Create boundary markers for all CDR regions
    const cdrBounds = naiveData.source
      .filter((region) => region.region === 'CDR1' || region.region === 'CDR2' || region.region === 'CDR3')
      .flatMap((region) => [
        { x: Math.floor(region.start / 3) - 0.5, region: region.region },
        { x: Math.floor(region.end / 3) + 0.5, region: region.region }
      ]);

    return {
      selectedFamily,
      selectedTree,
      naiveData,
      tree: treesSelector.getTreeData(state),
      selectedSeq: state.clonalFamilies.selectedSeq,
      cdrBounds
    };
  }
  return { selectedFamily, selectedTree };
};

// now for the actual component definition

@connect(mapStateToProps, (dispatch) => ({
  dispatchSelectedSeq: (seq) => {
    dispatch(explorerActions.updateSelectedSeq(seq));
  },
  dispatchSelectFamily: (family_ident) => {
    dispatch(explorerActions.selectFamily(family_ident));
  }
}))
class TreeViz extends React.Component {
  constructor(props) {
    super(props);
    this.spec = concatTreeWithAlignmentSpec();
    this.treeDataFromProps = this.treeDataFromProps.bind(this);
    this.tempVegaData = {
      source_0: [],
      source_1: [],
      naive_data: [],
      cdr_bounds: [{ x: 0 }, { x: 100 }],
      leaves_count_incl_naive: 42,
      pts_tuple: [],
      seed: []
    };
  }

  componentDidMount() {
    const { selectedFamily, dispatchSelectFamily } = this.props;
    // Automatically request a tree for the selected family
    // when the component is first inserted into the DOM tree.
    const familyId = selectedFamily?.ident || selectedFamily?.clone_id;
    if (familyId) {
      dispatchSelectFamily(familyId);
    }
  }

  // Try to source data for the vega viz from props instead of faking
  // with the empty data attribute set in the constructor
  treeDataFromProps() {
    const { tree, naiveData, cdrBounds, selectedFamily } = this.props;
    return {
      source_0: tree.nodes,
      source_1: tree.tips_alignment,
      naive_data: naiveData.source,
      cdr_bounds: cdrBounds,
      leaves_count_incl_naive: tree.leaves_count_incl_naive,
      pts_tuple: selectedFamily,
      // Here we create a separate dataset only containing the id of the
      // seed sequence so as to check quickly for this id within the
      // viz to color the seed blue
      seed: selectedFamily.seed_id === null ? [] : [{ id: selectedFamily.seed_id }]
    };
  }

  render() {
    const { selectedFamily, selectedTree, selectedSeq, tree, dispatchSelectedSeq } = this.props;
    // TODO #94: We need to have a better way to tell if a family should not be
    // displayed because its data are incomplete. One idea is an 'incomplete' field
    // that we can set to true (upon building and checking for valid data) and have some
    // minimum bit of information saying the error that occured and/or the field that was not built.
    const incompleteFamily = !selectedFamily.unique_seqs_count || !selectedFamily.trees;

    // Being explicit about the fact that we are relying on the tree being
    // defined vs undefined instead of keeping track of its true loading state
    const treeLoading = !selectedTree;

    const incompleteTree = !treeLoading && !isTreeComplete(selectedTree);
    const completeData = !incompleteFamily && !treeLoading && isTreeComplete(selectedTree);
    return (
      <div>
        {/* Tree still loading aka undefined */}
        {!incompleteFamily && treeLoading && (
          <div>
            <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <SimpleInProgress />
              Loading data for clonal family: {selectedFamily.clone_id}
            </h2>
          </div>
        )}
        {/* Warn user if data does not have necessary fields according to incompleteFamily, incompleteTree */}
        {incompleteFamily && <IncompleteDataWarning data_type="clonal family" datum={selectedFamily} />}
        {incompleteTree && <IncompleteDataWarning data_type="tree" datum={selectedTree} />}
        {/* Show tree header if complete family, tree */}
        {completeData && (
          <TreeHeader
            selectedFamily={selectedFamily}
            selectedTree={selectedTree}
            selectedSeq={selectedSeq}
            tree={tree}
          />
        )}
        {/* Vega component always gets rendered, its data are faked if necessary;
               this allows us to not reset its UI controls between selecting trees */}
        <Vega
          onParseError={(...args) => console.error("parse error:", args)}
          onSignalPts_tuple={(...args) => {
            const node = args.slice(1)[0];
            if (node.parent) {
              // update selected sequence for lineage mode if it has a parent ie if it is not a bad request
              dispatchSelectedSeq(node.sequence_id);
            }
          }}
          debug
          // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
          data={completeData ? this.treeDataFromProps() : this.tempVegaData}
          spec={this.spec}
        />

        {/* Show downloads if complete family, tree */}
        {completeData && tree.download_unique_family_seqs && (
          <div>
            <DownloadFasta
              sequencesSet={tree.download_unique_family_seqs.slice()}
              filename={(selectedFamily.sample_id || selectedFamily.subject_id || "sample").concat(
                "-",
                selectedFamily.clone_id,
                ".fasta"
              )}
              label="Download Fasta: Unique Sequences In This Tree"
            />

            <DownloadText
              text={selectedTree.newick}
              filename={(selectedFamily.sample_id || selectedFamily.subject_id || "sample").concat(
                "-",
                selectedFamily.clone_id,
                "-newick",
                ".txt"
              )}
              label="Download Clonal Family Tree Newick String"
            />
          </div>
        )}
      </div>
    );
  }
}

export { TreeViz };
