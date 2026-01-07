/**
 * Form for saving current visualization settings as a named config
 */

import React from "react";
import { connect } from "react-redux";
import * as configActions from "../../actions/configs";
import {
  createConfig,
  extractCurrentSettings
} from "../../utils/configManager";
import VegaViewContext from "./VegaViewContext";

const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px"
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px"
};

const labelStyle = {
  fontSize: "14px",
  fontWeight: "500",
  color: "#333"
};

const inputStyle = {
  padding: "10px 12px",
  borderRadius: "4px",
  border: "1px solid #ccc",
  fontSize: "14px",
  transition: "border-color 0.2s"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "60px",
  resize: "vertical"
};

const buttonStyle = {
  padding: "12px 20px",
  borderRadius: "4px",
  border: "none",
  backgroundColor: "#4a90a4",
  color: "white",
  cursor: "pointer",
  fontSize: "14px",
  fontWeight: "500",
  transition: "background-color 0.2s",
  marginTop: "8px"
};

const disabledButtonStyle = {
  ...buttonStyle,
  backgroundColor: "#ccc",
  cursor: "not-allowed"
};

const hintStyle = {
  fontSize: "12px",
  color: "#666",
  marginTop: "4px"
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

class ConfigSaveForm extends React.Component {
  static contextType = VegaViewContext;

  constructor(props) {
    super(props);
    this.state = {
      name: "",
      description: "",
      isSaving: false,
      error: null,
      success: null
    };
  }

  handleNameChange = (e) => {
    this.setState({ name: e.target.value, error: null });
  };

  handleDescriptionChange = (e) => {
    this.setState({ description: e.target.value });
  };

  getCurrentSettings = () => {
    const { reduxState } = this.props;

    // Get Vega views from context
    const scatterplotView = this.context?.scatterplotView;
    const treeView = this.context?.treeView;

    // Extract settings from views and Redux state
    return extractCurrentSettings(scatterplotView, treeView, reduxState);
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    const { name, description } = this.state;

    if (!name.trim()) {
      this.setState({ error: "Please enter a name for this configuration" });
      return;
    }

    this.setState({ isSaving: true, error: null, success: null });

    try {
      const { dispatch, onSave } = this.props;

      // Get current settings
      const settings = this.getCurrentSettings();

      // Create config object
      const config = createConfig(name.trim(), settings, {
        description: description.trim()
      });

      // Save to IndexedDB and Redux
      await dispatch(configActions.saveConfig(config));

      this.setState({
        name: "",
        description: "",
        isSaving: false,
        success: `Configuration "${name}" saved successfully!`
      });

      // Callback to parent (e.g., switch to saved configs tab)
      if (onSave) {
        setTimeout(() => onSave(config), 1000);
      }
    } catch (error) {
      this.setState({
        isSaving: false,
        error: `Failed to save configuration: ${error.message}`
      });
    }
  };

  render() {
    const { name, description, isSaving, error, success } = this.state;

    const canSubmit = name.trim().length > 0 && !isSaving;

    return (
      <form style={formStyle} onSubmit={this.handleSubmit}>
        {error && <div style={errorMessageStyle}>{error}</div>}
        {success && <div style={successMessageStyle}>{success}</div>}

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="config-name">
            Configuration Name *
          </label>
          <input
            id="config-name"
            type="text"
            style={inputStyle}
            value={name}
            onChange={this.handleNameChange}
            placeholder="e.g., My Preferred View"
            disabled={isSaving}
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle} htmlFor="config-description">
            Description (optional)
          </label>
          <textarea
            id="config-description"
            style={textareaStyle}
            value={description}
            onChange={this.handleDescriptionChange}
            placeholder="Brief description of this configuration..."
            disabled={isSaving}
          />
        </div>

        <div style={hintStyle}>
          This will save your current scatterplot, tree, and ancestral sequence visualization settings,
          including axis selections, colors, sizes, zoom/pan state, and display options.
        </div>

        <button
          type="submit"
          style={canSubmit ? buttonStyle : disabledButtonStyle}
          disabled={!canSubmit}
        >
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </form>
    );
  }
}

const mapStateToProps = (state) => ({
  reduxState: state
});

export default connect(mapStateToProps)(ConfigSaveForm);
