/**
 * List of saved visualization configs with load/delete/export actions
 */

import React from "react";
import { connect } from "react-redux";
import { FiCheck, FiDownload, FiTrash2, FiRefreshCw, FiInfo } from "react-icons/fi";
import * as configActions from "../../actions/configs";

const listContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px"
};

const emptyStateStyle = {
  textAlign: "center",
  padding: "40px 20px",
  color: "#666"
};

const configItemStyle = {
  display: "flex",
  alignItems: "center",
  padding: "12px",
  backgroundColor: "#f8f9fa",
  borderRadius: "6px",
  border: "1px solid #e0e0e0"
};

const configInfoStyle = {
  flex: 1,
  minWidth: 0
};

const configNameStyle = {
  margin: 0,
  fontSize: "14px",
  fontWeight: "500",
  color: "#333",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis"
};

const configMetaStyle = {
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "#888"
};

const configDescStyle = {
  margin: "4px 0 0 0",
  fontSize: "12px",
  color: "#666",
  fontStyle: "italic"
};

const actionsContainerStyle = {
  display: "flex",
  gap: "8px",
  marginLeft: "12px"
};

const iconButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "6px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  backgroundColor: "white",
  cursor: "pointer",
  transition: "all 0.15s ease"
};

const applyButtonStyle = {
  ...iconButtonStyle,
  backgroundColor: "#4a90a4",
  borderColor: "#4a90a4",
  color: "white"
};

const infoButtonStyle = {
  ...iconButtonStyle,
  color: "#17a2b8",
  borderColor: "#17a2b8"
};

const exportButtonStyle = {
  ...iconButtonStyle,
  color: "#6c757d",
  borderColor: "#6c757d"
};

const deleteButtonStyle = {
  ...iconButtonStyle,
  color: "#dc3545",
  borderColor: "#dc3545"
};

const updateButtonStyle = {
  ...iconButtonStyle,
  backgroundColor: "#28a745",
  borderColor: "#28a745",
  color: "white"
};

const badgeStyle = {
  display: "inline-block",
  padding: "2px 6px",
  borderRadius: "10px",
  fontSize: "10px",
  fontWeight: "500",
  marginLeft: "8px"
};

const globalBadgeStyle = {
  ...badgeStyle,
  backgroundColor: "#e3f2fd",
  color: "#1976d2"
};

const datasetBadgeStyle = {
  ...badgeStyle,
  backgroundColor: "#fff3e0",
  color: "#f57c00"
};

/**
 * Format timestamp to readable date
 */
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

class ConfigList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expandedInfoId: null
    };
  }

  toggleInfo = (configId) => {
    this.setState((prevState) => ({
      expandedInfoId: prevState.expandedInfoId === configId ? null : configId
    }));
  };

  handleApply = (config) => {
    const { onApply } = this.props;
    // Call parent handler which applies settings and dispatches action
    if (onApply) {
      onApply(config);
    }
  };

  handleDelete = async (config) => {
    const confirmed = window.confirm(`Delete configuration "${config.name}"?`);
    if (!confirmed) return;

    const { dispatch, onDelete } = this.props;
    await dispatch(configActions.deleteConfig(config.id));
    if (onDelete) {
      onDelete(config);
    }
  };

  handleExport = (config) => {
    const { onExport } = this.props;
    if (onExport) {
      onExport(config);
    }
  };

  handleUpdate = (config) => {
    const { onUpdate } = this.props;
    if (onUpdate) {
      onUpdate(config);
    }
  };

  renderConfigItem = (config) => {
    const { activeConfigId } = this.props;
    const { expandedInfoId } = this.state;
    const isActive = config.id === activeConfigId;
    const isInfoExpanded = expandedInfoId === config.id;

    const infoContentStyle = {
      marginTop: "10px",
      padding: "10px",
      backgroundColor: "#e7f3ff",
      border: "1px solid #b3d7ff",
      borderRadius: "4px",
      fontSize: "12px",
      color: "#0a4a7c"
    };

    return (
      <div key={config.id} style={{ ...configItemStyle, flexDirection: "column", alignItems: "stretch" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div style={configInfoStyle}>
            <h4 style={configNameStyle}>
              {config.name}
              {config.datasetId ? (
                <span style={datasetBadgeStyle}>Dataset-specific</span>
              ) : (
                <span style={globalBadgeStyle}>Global</span>
              )}
              {isActive && (
                <span style={{ ...badgeStyle, backgroundColor: "#d4edda", color: "#155724" }}>
                  Active
                </span>
              )}
            </h4>
            <p style={configMetaStyle}>
              Last edited: {formatDate(config.updatedAt || config.createdAt)}
            </p>
          </div>

          <div style={actionsContainerStyle}>
            {isActive && (
              <button
                style={updateButtonStyle}
                onClick={() => this.handleUpdate(config)}
                title="Update with current settings"
              >
                <FiRefreshCw size={14} />
              </button>
            )}
            <button
              style={applyButtonStyle}
              onClick={() => this.handleApply(config)}
              title="Apply this configuration"
            >
              <FiCheck size={14} />
            </button>
            <button
              style={{ ...infoButtonStyle, backgroundColor: isInfoExpanded ? "#e7f3ff" : "white" }}
              onClick={() => this.toggleInfo(config.id)}
              title="View configuration details"
            >
              <FiInfo size={14} />
            </button>
            <button
              style={exportButtonStyle}
              onClick={() => this.handleExport(config)}
              title="Export configuration"
            >
              <FiDownload size={14} />
            </button>
            <button
              style={deleteButtonStyle}
              onClick={() => this.handleDelete(config)}
              title="Delete configuration"
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>

        {isInfoExpanded && (
          <div style={infoContentStyle}>
            <div style={{ marginBottom: "10px" }}>
              <strong>Name:</strong> {config.name}
            </div>
            {config.description && (
              <div style={{ marginBottom: "10px" }}>
                <strong>Description:</strong> {config.description}
              </div>
            )}
            <div style={{ marginBottom: "10px" }}>
              <strong>Created:</strong> {formatDate(config.createdAt)}
              {config.updatedAt !== config.createdAt && (
                <span> | <strong>Last updated:</strong> {formatDate(config.updatedAt)}</span>
              )}
            </div>
            <div>
              <strong>Settings stored:</strong>
              <ul style={{ margin: "4px 0 0 0", paddingLeft: "20px" }}>
                {config.settings?.scatterplot && <li>Scatterplot: axes, colors, shapes, faceting, zoom/pan</li>}
                {config.settings?.tree && <li>Tree view: display options, alignment zoom/pan</li>}
                {config.settings?.lineage && <li>Lineage: show entire lineage, mutation borders, chain</li>}
                {config.settings?.global && <li>Global: filters, selected chain</li>}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };

  render() {
    const { configs } = this.props;

    if (!configs || configs.length === 0) {
      return (
        <div style={emptyStateStyle}>
          <p>No saved configurations yet.</p>
          <p style={{ fontSize: "13px", marginTop: "8px" }}>
            Go to the &quot;Save Current&quot; tab to save your current visualization settings.
          </p>
        </div>
      );
    }

    return <div style={listContainerStyle}>{configs.map(this.renderConfigItem)}</div>;
  }
}

const mapStateToProps = (state) => ({
  activeConfigId: state.configs.activeConfigId
});

export default connect(mapStateToProps)(ConfigList);
