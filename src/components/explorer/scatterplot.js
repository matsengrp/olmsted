import { connect } from "react-redux";
import React from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import VegaChart from "../util/VegaChart";
import * as clonalFamiliesSelectors from "../../selectors/clonalFamilies";
import facetClonalFamiliesVizSpec from "./vega/facetScatterPlot";
import * as explorerActions from "../../actions/explorer";
import VegaViewContext from "../config/VegaViewContext";
import { VegaExportToolbar } from "../util/VegaExportButton";

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
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      vegaView: null,
      hideControls: false
    };
    // Build spec with field_metadata from loaded datasets (if available)
    const loadedDataset = props.datasets?.find((d) => d.loading === "DONE");
    const fieldMetadata = loadedDataset?.field_metadata?.clone || null;
    this.spec = facetClonalFamiliesVizSpec({ fieldMetadata });
    this.lastFieldMetadata = fieldMetadata;
    this.lastClearTrigger = 0;
    this.containerRef = React.createRef();
    this.isFocused = false;
    this.handleWindowClick = this.handleWindowClick.bind(this);
    this.handleWheel = this.handleWheel.bind(this);
  }

  toggleHideControls = () => {
    this.setState((prevState) => ({ hideControls: !prevState.hideControls }));
  };

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
      if (this.state.vegaView) {
        this.state.vegaView.signal("viz_focused", false).run();
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
    const { hideControls } = this.state;

    // Rebuild spec if field_metadata changed (e.g., different dataset loaded)
    const loadedDataset = datasets?.find((d) => d.loading === "DONE");
    const fieldMetadata = loadedDataset?.field_metadata?.clone || null;
    if (fieldMetadata !== this.lastFieldMetadata) {
      this.spec = facetClonalFamiliesVizSpec({ fieldMetadata });
      this.lastFieldMetadata = fieldMetadata;
    }

    if (availableClonalFamilies) {
      return (
        <div
          ref={this.containerRef}
          className={hideControls ? "hide-vega-controls" : ""}
          style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px" }}
        >
          {/* Hide controls CSS - only applied when hideControls is true */}
          {hideControls && (
            <style>{`
              .hide-vega-controls .vega-bindings { display: none !important; }
            `}</style>
          )}
          {/* Here we have our Vega component specification, where we plug in signal handlers, etc. */}
          {availableClonalFamilies.length > 0 && (
            <VegaChart
              onNewView={(view) => {
                this.setState({ vegaView: view });
                // Register view with context for config management
                if (this.context && this.context.setScatterplotView) {
                  this.context.setScatterplotView(view);
                }
                // Listen for focus changes to sync with React
                view.addSignalListener("viz_focused", (name, value) => {
                  this.isFocused = value;
                });
                // Signal listeners for user interactions
                view.addSignalListener("pts_tuple", (name, family) => {
                  if (family && family.ident) {
                    selectFamily(family.ident, true);
                  }
                });
                view.addSignalListener("mouseDown", (name, coords) => {
                  if (coords) {
                    updateSelectingStatus();
                    this.mouseDown = true;
                  }
                });
                view.addSignalListener("mouseUp", (name, coords) => {
                  const wasMouseDown = this.mouseDown;
                  if (this.mouseDown && coords) {
                    updateSelectingStatus();
                  }
                  this.mouseDown = false;

                  // Only poll brush values when the user was interacting with
                  // the plot (mouseDown was set). Skip for clicks on Vega
                  // binding controls or other UI elements.
                  if (!wasMouseDown) return;

                  // Vega 6 workaround: addSignalListener doesn't fire for
                  // signal-driven push:"outer" updates from nested groups.
                  // Poll brush signal values after mouseUp instead.
                  // Read xField/yField directly from view rather than cached
                  // this.xField/this.yField, which can be stale after re-embeds.
                  const brushXField = view.signal("brush_x_field");
                  const brushYField = view.signal("brush_y_field");
                  const currentXField = view.signal("xField");
                  const currentYField = view.signal("yField");
                  if (brushXField || brushYField) {
                    if (brushXField) {
                      updateBrushSelection("x", currentXField, brushXField);
                    }
                    if (brushYField) {
                      updateBrushSelection("y", currentYField, brushYField);
                    }
                    const brushedFacet = view.signal("brushed_facet_value");
                    if (brushedFacet && brushedFacet[0] && brushedFacet[0] !== "<none>") {
                      filterBrushSelection(brushedFacet[0], brushedFacet[1]);
                    }
                  } else {
                    // Brush was cleared (clicked off) — revert to showing all families
                    clearBrushSelection();
                  }
                });
                view.addSignalListener("clicked", (name, datum) => {
                  if (datum && datum.ident) {
                    selectFamily(datum.ident, true);
                  }
                });
                view.addSignalListener("facet_col_signal", (name, result) => {
                  updateFacet(result);
                });
                // Note: brush_x_field, brush_y_field, brush_selection, and
                // brushed_facet_value are handled via polling in the mouseUp
                // handler above. In Vega 6, addSignalListener doesn't fire for
                // signal-chain push:"outer" updates from nested group marks.
                view.addSignalListener("clear_selection_trigger", (name, trigger) => {
                  if (trigger > this.lastClearTrigger) {
                    this.lastClearTrigger = trigger;
                    clearBrushSelection();
                  }
                });
              }}
              onError={(...args) => console.error("Vega error:", args)}
              data={{
                source: availableClonalFamilies,
                selected: [{ ident: selectedFamily ? selectedFamily.ident : "none" }],
                locus: [{ locus: locus }],
                datasets: datasets
              }}
              spec={this.spec}
            />
          )}
          {/* Toolbar: Hide Controls and Export - positioned after the plot */}
          {availableClonalFamilies.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={this.toggleHideControls}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 8px",
                  fontSize: 12,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  backgroundColor: hideControls ? "#e3f2fd" : "#fff",
                  color: "#333",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
                title={hideControls ? "Show plot controls" : "Hide plot controls"}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = hideControls ? "#bbdefb" : "#f5f5f5";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = hideControls ? "#e3f2fd" : "#fff";
                }}
              >
                {hideControls ? <FiEye size={14} /> : <FiEyeOff size={14} />}
                <span>{hideControls ? "Show Plot Settings" : "Hide Plot Settings"}</span>
              </button>
              <VegaExportToolbar vegaView={this.state.vegaView} filename="olmsted-scatterplot" />
            </div>
          )}
        </div>
      );
    }
    return <h3>Loading data...</h3>;
  }
}

export { ClonalFamiliesViz };
