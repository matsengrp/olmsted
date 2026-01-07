/**
 * Modal dialog for managing visualization configs
 */

import React from "react";
import { connect } from "react-redux";
import { FiHelpCircle } from "react-icons/fi";
import * as configActions from "../../actions/configs";
import * as explorerActions from "../../actions/explorer";
import ConfigList from "./ConfigList";
import ConfigSaveForm from "./ConfigSaveForm";
import VegaViewContext from "./VegaViewContext";
import {
  downloadConfig,
  importConfigFromJson,
  applyScatterplotSettings,
  applyTreeSettings,
  extractCurrentSettings,
  resolveValue,
  DEFAULT_SCATTERPLOT_SETTINGS,
  DEFAULT_TREE_SETTINGS,
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_LINEAGE_SETTINGS
} from "../../utils/configManager";

const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000
};

const modalContentStyle = {
  backgroundColor: "white",
  borderRadius: "8px",
  width: "90%",
  maxWidth: "600px",
  maxHeight: "80vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)"
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  borderBottom: "1px solid #e0e0e0"
};

const modalTitleStyle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: "600",
  color: "#333"
};

const closeButtonStyle = {
  background: "none",
  border: "none",
  fontSize: "24px",
  cursor: "pointer",
  color: "#666",
  padding: "0",
  lineHeight: 1
};

const tabContainerStyle = {
  display: "flex",
  borderBottom: "1px solid #e0e0e0"
};

const tabStyle = {
  flex: 1,
  padding: "12px 16px",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontSize: "14px",
  color: "#666",
  borderBottom: "2px solid transparent",
  transition: "all 0.2s"
};

const activeTabStyle = {
  ...tabStyle,
  color: "#4a90a4",
  borderBottomColor: "#4a90a4",
  fontWeight: "500"
};

const tabContentStyle = {
  padding: "20px",
  overflowY: "auto",
  flex: 1
};

const importExportContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px"
};

const buttonStyle = {
  padding: "10px 16px",
  borderRadius: "4px",
  border: "1px solid #4a90a4",
  backgroundColor: "#4a90a4",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  transition: "background-color 0.2s"
};

const secondaryButtonStyle = {
  ...buttonStyle,
  backgroundColor: "white",
  color: "#4a90a4"
};

const resetButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#6c757d",
  borderColor: "#6c757d"
};

const fileInputStyle = {
  display: "none"
};

const messageStyle = {
  padding: "10px",
  borderRadius: "4px",
  marginBottom: "10px"
};

const successMessageStyle = {
  ...messageStyle,
  backgroundColor: "#d4edda",
  color: "#155724",
  border: "1px solid #c3e6cb"
};

const errorMessageStyle = {
  ...messageStyle,
  backgroundColor: "#f8d7da",
  color: "#721c24",
  border: "1px solid #f5c6cb"
};

class ConfigModal extends React.Component {
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      activeTab: "saved", // 'saved', 'save', 'importExport'
      importError: null,
      importSuccess: null,
      applySuccess: null,
      showHelp: false
    };
    this.fileInputRef = React.createRef();
  }

  componentDidMount() {
    const { dispatch } = this.props;
    dispatch(configActions.loadConfigs());
  }

  /**
   * Apply a config to the visualization views
   */
  handleApplyConfig = (config) => {
    const { dispatch } = this.props;
    const { scatterplotView, treeView } = this.context || {};

    if (!config || !config.settings) {
      console.warn("Cannot apply config: invalid config object");
      return;
    }

    // Apply scatterplot settings
    if (config.settings.scatterplot && scatterplotView) {
      applyScatterplotSettings(scatterplotView, config.settings.scatterplot);
    }

    // Apply tree settings
    if (config.settings.tree && treeView) {
      applyTreeSettings(treeView, config.settings.tree);
    }

    // Apply global settings via Redux
    if (config.settings.global) {
      // Handle filters
      if (config.settings.global.filters !== undefined) {
        // First clear all existing filters
        dispatch(explorerActions.clearAllFilters());
        // Then apply each filter from the config
        const filters = resolveValue(config.settings.global.filters, DEFAULT_GLOBAL_SETTINGS.filters);
        if (filters && typeof filters === "object") {
          Object.entries(filters).forEach(([field, values]) => {
            if (Array.isArray(values) && values.length > 0) {
              dispatch(explorerActions.setFilter(field, values));
            }
          });
        }
      }
      // Handle legacy locus field for backward compatibility
      if (config.settings.global.locus !== undefined && config.settings.global.filters === undefined) {
        const locus = config.settings.global.locus;
        if (locus && locus !== "All") {
          dispatch(explorerActions.setFilter("sample.locus", [locus]));
        }
      }
      if (config.settings.global.selectedChain !== undefined) {
        const chain = resolveValue(config.settings.global.selectedChain, DEFAULT_GLOBAL_SETTINGS.selectedChain);
        dispatch(explorerActions.updateSelectedChain(chain));
      }
    }

    // Apply lineage (ancestral sequence) settings via Redux
    if (config.settings.lineage) {
      if (config.settings.lineage.showEntire !== undefined) {
        const showEntire = resolveValue(config.settings.lineage.showEntire, DEFAULT_LINEAGE_SETTINGS.showEntire);
        dispatch(explorerActions.updateLineageShowEntire(showEntire));
      }
      if (config.settings.lineage.showBorders !== undefined) {
        const showBorders = resolveValue(config.settings.lineage.showBorders, DEFAULT_LINEAGE_SETTINGS.showBorders);
        dispatch(explorerActions.updateLineageShowBorders(showBorders));
      }
      if (config.settings.lineage.chain !== undefined) {
        const chain = resolveValue(config.settings.lineage.chain, DEFAULT_LINEAGE_SETTINGS.chain);
        dispatch(explorerActions.updateLineageChain(chain));
      }
    }

    // Mark config as active in Redux
    dispatch(configActions.applyConfig(config.id));

    // Show success message briefly
    this.setState({ applySuccess: `Applied "${config.name}"` });
    setTimeout(() => this.setState({ applySuccess: null }), 2000);
  };

  /**
   * Update an existing config with current visualization settings
   */
  handleUpdateConfig = async (config) => {
    const { dispatch, reduxState } = this.props;
    const { scatterplotView, treeView } = this.context || {};

    // Get current settings using the same extraction as ConfigSaveForm
    const newSettings = extractCurrentSettings(scatterplotView, treeView, reduxState);

    try {
      await dispatch(configActions.updateConfig(config.id, newSettings));
      this.setState({ applySuccess: `Updated "${config.name}"` });
      setTimeout(() => this.setState({ applySuccess: null }), 2000);
    } catch (error) {
      console.error("Failed to update config:", error);
    }
  };

  /**
   * Reset all visualization settings to application defaults
   */
  handleResetToDefaults = () => {
    const { dispatch } = this.props;
    const { scatterplotView, treeView } = this.context || {};

    // Apply default scatterplot settings
    if (scatterplotView) {
      applyScatterplotSettings(scatterplotView, DEFAULT_SCATTERPLOT_SETTINGS);
    }

    // Apply default tree settings
    if (treeView) {
      applyTreeSettings(treeView, DEFAULT_TREE_SETTINGS);
    }

    // Apply default global settings
    dispatch(explorerActions.clearAllFilters());
    dispatch(explorerActions.updateSelectedChain(DEFAULT_GLOBAL_SETTINGS.selectedChain));

    // Apply default lineage settings
    dispatch(explorerActions.updateLineageShowEntire(DEFAULT_LINEAGE_SETTINGS.showEntire));
    dispatch(explorerActions.updateLineageShowBorders(DEFAULT_LINEAGE_SETTINGS.showBorders));
    dispatch(explorerActions.updateLineageChain(DEFAULT_LINEAGE_SETTINGS.chain));

    // Clear active config
    dispatch(configActions.clearActiveConfig());

    // Show success message
    this.setState({ applySuccess: "Reset to defaults" });
    setTimeout(() => this.setState({ applySuccess: null }), 2000);
  };

  handleClose = () => {
    const { dispatch } = this.props;
    dispatch(configActions.closeConfigModal());
  };

  handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      this.handleClose();
    }
  };

  handleKeyDown = (e) => {
    if (e.key === "Escape") {
      this.handleClose();
    }
  };

  handleTabClick = (tab) => {
    this.setState({ activeTab: tab, importError: null, importSuccess: null });
  };

  handleExportConfig = (config) => {
    const filename = config.name.replace(/[^a-z0-9]/gi, "-").toLowerCase();
    downloadConfig(config, filename);
  };

  handleImportClick = () => {
    this.fileInputRef.current.click();
  };

  handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const { config, error } = importConfigFromJson(text);

      if (error) {
        this.setState({ importError: error, importSuccess: null });
        return;
      }

      const { dispatch } = this.props;
      await dispatch(configActions.saveConfig(config));
      this.setState({
        importSuccess: `Successfully imported "${config.name}"`,
        importError: null,
        activeTab: "saved"
      });
    } catch (error) {
      this.setState({ importError: error.message, importSuccess: null });
    }

    // Reset file input
    e.target.value = "";
  };

  renderTabContent() {
    const { activeTab, importError, importSuccess, applySuccess } = this.state;
    const { savedConfigs } = this.props;

    switch (activeTab) {
      case "saved":
        return (
          <div>
            {applySuccess && <div style={successMessageStyle}>{applySuccess}</div>}
            <div style={{ marginBottom: "16px" }}>
              <button
                style={resetButtonStyle}
                onClick={this.handleResetToDefaults}
                title="Reset all visualization settings to application defaults"
              >
                Reset to Defaults
              </button>
            </div>
            <ConfigList
              configs={savedConfigs}
              onApply={this.handleApplyConfig}
              onExport={this.handleExportConfig}
              onUpdate={this.handleUpdateConfig}
            />
          </div>
        );

      case "save":
        return (
          <ConfigSaveForm
            onSave={() => this.setState({ activeTab: "saved" })}
          />
        );

      case "importExport":
        return (
          <div style={importExportContainerStyle}>
            {importError && <div style={errorMessageStyle}>{importError}</div>}
            {importSuccess && <div style={successMessageStyle}>{importSuccess}</div>}

            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Import Configuration</h4>
              <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "13px" }}>
                Import a previously exported configuration file (.olmsted-config.json)
              </p>
              <button style={buttonStyle} onClick={this.handleImportClick}>
                Choose File to Import
              </button>
              <input
                ref={this.fileInputRef}
                type="file"
                accept=".json,.olmsted-config.json"
                style={fileInputStyle}
                onChange={this.handleFileChange}
              />
            </div>

            <hr style={{ border: "none", borderTop: "1px solid #e0e0e0", margin: "8px 0" }} />

            <div>
              <h4 style={{ margin: "0 0 8px 0", fontSize: "14px" }}>Export Configuration</h4>
              <p style={{ margin: "0 0 12px 0", color: "#666", fontSize: "13px" }}>
                To export a saved configuration, go to the &quot;Saved Configs&quot; tab and click the export button next to the config you want to export.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  toggleHelp = () => {
    this.setState((prevState) => ({ showHelp: !prevState.showHelp }));
  };

  render() {
    const { isOpen } = this.props;
    const { activeTab, showHelp } = this.state;

    if (!isOpen) return null;

    const helpIconStyle = {
      marginLeft: "8px",
      cursor: "pointer",
      color: showHelp ? "#4a90a4" : "#999",
      transition: "color 0.15s ease",
      verticalAlign: "middle"
    };

    const helpContentStyle = {
      padding: "12px 16px",
      backgroundColor: "#e7f3ff",
      borderBottom: "1px solid #b3d7ff",
      fontSize: "13px",
      color: "#0a4a7c",
      lineHeight: "1.5"
    };

    return (
      <div
        style={modalOverlayStyle}
        onClick={this.handleOverlayClick}
        onKeyDown={this.handleKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="config-modal-title"
        tabIndex={-1}
      >
        <div style={modalContentStyle}>
          <div style={modalHeaderStyle}>
            <h2 id="config-modal-title" style={modalTitleStyle}>
              Visualization Settings
              <FiHelpCircle
                size={18}
                style={helpIconStyle}
                onClick={this.toggleHelp}
                onMouseEnter={(e) => { e.target.style.color = "#4a90a4"; }}
                onMouseLeave={(e) => { e.target.style.color = showHelp ? "#4a90a4" : "#999"; }}
                title="Click for help"
              />
            </h2>
            <button
              style={closeButtonStyle}
              onClick={this.handleClose}
              aria-label="Close modal"
            >
              &times;
            </button>
          </div>

          {showHelp && (
            <div style={helpContentStyle}>
              <strong>Configuration Management</strong>
              <p style={{ margin: "8px 0 0 0" }}>
                Save and restore your visualization settings including scatterplot options (axes, colors, shapes, faceting, zoom/pan),
                tree view settings (display options, alignment zoom/pan), lineage display preferences, and optionally your current selections.
              </p>
              <ul style={{ margin: "8px 0 0 0", paddingLeft: "20px" }}>
                <li><strong>Saved Configs:</strong> View, apply, update, or delete your saved configurations</li>
                <li><strong>Save Current:</strong> Save your current visualization settings as a new configuration</li>
                <li><strong>Import/Export:</strong> Share configurations as JSON files between sessions or users</li>
                <li><strong>Reset to Defaults:</strong> Restore all settings to their original values</li>
              </ul>
            </div>
          )}

          <div style={tabContainerStyle}>
            <button
              style={activeTab === "saved" ? activeTabStyle : tabStyle}
              onClick={() => this.handleTabClick("saved")}
            >
              Saved Configs
            </button>
            <button
              style={activeTab === "save" ? activeTabStyle : tabStyle}
              onClick={() => this.handleTabClick("save")}
            >
              Save Current
            </button>
            <button
              style={activeTab === "importExport" ? activeTabStyle : tabStyle}
              onClick={() => this.handleTabClick("importExport")}
            >
              Import / Export
            </button>
          </div>

          <div style={tabContentStyle}>{this.renderTabContent()}</div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  isOpen: state.configs.isModalOpen,
  savedConfigs: state.configs.savedConfigs,
  reduxState: state
});

export default connect(mapStateToProps)(ConfigModal);
