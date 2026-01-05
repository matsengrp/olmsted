/**
 * List of saved visualization configs with load/delete/export actions
 */

import React from "react";
import { connect } from "react-redux";
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

const actionButtonStyle = {
  padding: "6px 12px",
  borderRadius: "4px",
  border: "1px solid #4a90a4",
  backgroundColor: "#4a90a4",
  color: "white",
  cursor: "pointer",
  fontSize: "12px",
  transition: "background-color 0.2s"
};

const secondaryButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: "white",
  color: "#4a90a4"
};

const deleteButtonStyle = {
  ...actionButtonStyle,
  backgroundColor: "white",
  color: "#dc3545",
  borderColor: "#dc3545"
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

  renderConfigItem = (config) => {
    const { activeConfigId } = this.props;
    const isActive = config.id === activeConfigId;

    return (
      <div key={config.id} style={configItemStyle}>
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
          {config.description && <p style={configDescStyle}>{config.description}</p>}
          <p style={configMetaStyle}>
            Created: {formatDate(config.createdAt)}
            {config.updatedAt !== config.createdAt && ` | Updated: ${formatDate(config.updatedAt)}`}
          </p>
        </div>

        <div style={actionsContainerStyle}>
          <button
            style={actionButtonStyle}
            onClick={() => this.handleApply(config)}
            title="Apply this configuration"
          >
            Apply
          </button>
          <button
            style={secondaryButtonStyle}
            onClick={() => this.handleExport(config)}
            title="Export configuration"
          >
            Export
          </button>
          <button
            style={deleteButtonStyle}
            onClick={() => this.handleDelete(config)}
            title="Delete configuration"
          >
            Delete
          </button>
        </div>
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
