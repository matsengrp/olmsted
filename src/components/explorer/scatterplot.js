import { connect } from "react-redux";
import React from "react";
import Vega from "react-vega";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import facetClonalFamiliesVizSpec from "./vega/facetScatterPlot";
import * as explorerActions from "../../actions/explorer";

// Store the last clear_selection_trigger value to detect changes
let lastClearTrigger = 0;

// Clonal Families Viz
// ===================
//
// This is the main view in the entire vizualization as it's the first thing we always see once we explore,
// and it's the top level entry point for us in exploring datasets/clonal-families in gerater detail.
// Goal is to be super configurable and powerful.

@connect(
  (state) => ({
    availableClonalFamilies: clonalFamiliesSelectors.getAvailableClonalFamilies(state),
    selectedFamily: clonalFamiliesSelectors.getSelectedFamily(state),
    locus: state.clonalFamilies.locus,
    datasets: state.datasets.availableDatasets
  }),
  // This is a shorthand way of specifying mapDispatchToProps
  {
    selectFamily: explorerActions.selectFamily,
    updateBrushSelection: explorerActions.updateBrushSelection,
    filterBrushSelection: explorerActions.filterBrushSelection,
    updateSelectingStatus: explorerActions.updateSelectingStatus,
    updateFacet: explorerActions.updateFacet,
    clearBrushSelection: explorerActions.clearBrushSelection
  }
)
class ClonalFamiliesViz extends React.Component {
  constructor(props) {
    super(props);
    this.xField = "unique_seqs_count";
    this.yField = "mean_mut_freq";
    this.multiSelectMode = false;
    this.spec = facetClonalFamiliesVizSpec();
    this.containerRef = React.createRef();
    this.vegaView = null;
    this.isFocused = false;
    this.handleWindowClick = this.handleWindowClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  componentDidMount() {
    // Add window click listener to detect clicks outside the plot
    window.addEventListener("click", this.handleWindowClick);
    // Add wheel event listener with passive: false to allow preventDefault
    if (this.containerRef.current) {
      this.containerRef.current.addEventListener("wheel", this.handleWheel, { passive: false });
    }
  }

  componentWillUnmount() {
    window.removeEventListener("click", this.handleWindowClick);
    // Clean up wheel listener if it exists
    if (this.containerRef.current) {
      this.containerRef.current.removeEventListener("wheel", this.handleWheel);
    }
  }

  handleWindowClick(event) {
    // If click was outside our container, unfocus the visualization
    if (this.containerRef.current && !this.containerRef.current.contains(event.target)) {
      if (this.vegaView) {
        this.vegaView.signal("viz_focused", false).run();
      }
    }
  }

  handleWheel(event) {
    // Prevent page scroll when visualization is focused
    // The Vega spec already handles only zooming when in zoom mode
    if (this.isFocused) {
      event.preventDefault();
    }
  }

  render() {
    const {
      availableClonalFamilies,
      selectFamily,
      updateSelectingStatus,
      updateFacet,
      updateBrushSelection,
      filterBrushSelection,
      clearBrushSelection,
      selectedFamily,
      locus,
      datasets
    } = this.props;
    if (availableClonalFamilies) {
      return (
        <div ref={this.containerRef}>
          {/* Here we have our Vega component specification, where we plug in signal handlers, etc. */}
          {availableClonalFamilies.length > 0 && (
            <Vega
              onNewView={(view) => {
                this.vegaView = view;
                // Listen for focus changes to sync with React
                view.addSignalListener("viz_focused", (name, value) => {
                  this.isFocused = value;
                });
              }}
              // TURN THESE ON TO DEBUG SIGNALS
              // SEE https://github.com/matsengrp/olmsted/issues/65
              // onSignalWidth={(...args) => {
              //   let result = args.slice(1)[0]
              //   console.log("width", result)
              // }}
              // onSignalHeight={(...args) => {
              //   let result = args.slice(1)[0]
              //   console.log("height", result)
              // }}
              // onSignalBrush_x={(...args) => {
              //   let result = args.slice(1)[0]
              //   console.log('brushx: ', result)
              // }}
              // onSignalBrush_y={(...args) => {
              //   let result = args.slice(1)[0]
              //   console.log('brushy: ', result)
              // }}
              onSignalPts_tuple={(...args) => {
                const family = args.slice(1)[0];
                if (family && family.ident) {
                  // Second argument specifies that we would like to
                  // include just this family in our brush selection
                  // and therefore in the table since we have clicked it

                  selectFamily(family.ident, true);
                }
              }}
              onSignalMouseDown={(...args) => {
                const coords = args.slice(1)[0];
                // Must check to see if there are actual mouse coordinates
                // here and in the mouseup signal handler just below because
                // they are triggered with undefined upon rendering the viz
                if (coords) {
                  updateSelectingStatus();
                  this.mouseDown = true;
                }
              }}
              onSignalMouseUp={(...args) => {
                const coords = args.slice(1)[0];
                if (this.mouseDown && coords) {
                  updateSelectingStatus();
                }
                this.mouseDown = false;
              }}
              onSignalXField={(...args) => {
                const result = args.slice(1)[0];
                this.xField = result;
              }}
              onSignalYField={(...args) => {
                const result = args.slice(1)[0];
                this.yField = result;
              }}
              onSignalClicked={(...args) => {
                const datum = args.slice(1)[0];
                if (datum && datum.ident) {
                  selectFamily(datum.ident, true);
                }
              }}
              onSignalFacet_by_signal={(...args) => {
                const result = args.slice(1)[0];
                updateFacet(result);
              }}
              onSignalBrush_x_field={(...args) => {
                const result = args.slice(1)[0];
                updateBrushSelection("x", this.xField, result);
              }}
              onSignalBrush_y_field={(...args) => {
                const result = args.slice(1)[0];
                updateBrushSelection("y", this.yField, result);
              }}
              onSignalBrush_selection={(...args) => {
                const brushData = args.slice(1)[0];
                if (brushData && brushData.intervals) {
                  // Update brush selection with both X and Y ranges
                  if (brushData.intervals.x && brushData.intervals.x.extent) {
                    updateBrushSelection("x", brushData.intervals.x.field, brushData.intervals.x.extent);
                  }
                  if (brushData.intervals.y && brushData.intervals.y.extent) {
                    updateBrushSelection("y", brushData.intervals.y.field, brushData.intervals.y.extent);
                  }
                  // Handle facet filtering if present
                  if (brushData.facetKey && brushData.facetValue && brushData.facetKey !== "<none>") {
                    filterBrushSelection(brushData.facetKey, brushData.facetValue);
                  }
                }
              }}
              onSignalBrushed_facet_value={(...args) => {
                const keyVal = args.slice(1)[0];
                if (keyVal) {
                  filterBrushSelection(keyVal[0], keyVal[1]);
                }
              }}
              onSignalClear_selection_trigger={(...args) => {
                const trigger = args.slice(1)[0];
                // Only clear if the trigger value has changed (button was clicked)
                if (trigger > lastClearTrigger) {
                  lastClearTrigger = trigger;
                  clearBrushSelection();
                }
              }}
              onSignalMulti_select_mode={(...args) => {
                const isMultiSelect = args.slice(1)[0];
                // Store multi-select mode state on the component
                this.multiSelectMode = isMultiSelect;
              }}
              onParseError={(...args) => console.error("parse error:", args)}
              debug
              // logLevel={vega.Debug} // https://vega.github.io/vega/docs/api/view/#view_logLevel
              data={{
                source: availableClonalFamilies,
                // Here we create a separate dataset only containing the id of the
                // selected family so as to check quickly for this id within the
                // viz to highlight the selected family.
                selected: [{ ident: selectedFamily ? selectedFamily.ident : "none" }],
                locus: [{ locus: locus }],
                datasets: datasets
              }}
              spec={this.spec}
            />
          )}
        </div>
      );
    }
    return <h3>Loading data...</h3>;
  }
}

export { ClonalFamiliesViz };
