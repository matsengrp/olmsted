import React from "react";
import { FiDownload, FiImage } from "react-icons/fi";

/**
 * Button component for exporting Vega visualizations to PNG or SVG.
 *
 * Uses the Vega view's built-in toImageURL() and toSVG() methods.
 *
 * @param {Object} props
 * @param {Object} props.vegaView - The Vega view instance to export
 * @param {string} props.filename - Base filename (without extension)
 * @param {string} props.format - Export format: 'png' or 'svg'
 * @param {number} props.scaleFactor - Scale factor for PNG export (default: 2 for retina)
 * @param {string} props.label - Button label (optional)
 * @param {Object} props.style - Additional button styles (optional)
 */
class VegaExportButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      exporting: false,
      isHovered: false
    };
  }

  handleExport = async () => {
    const { vegaView, filename, format = "png", scaleFactor = 2 } = this.props;

    if (!vegaView) {
      console.warn("No Vega view available for export");
      return;
    }

    this.setState({ exporting: true });

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const fullFilename = `${filename}_${timestamp}`;

      if (format === "svg") {
        // Export as SVG
        const svgString = await vegaView.toSVG();
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        this.downloadBlob(blob, `${fullFilename}.svg`);
      } else {
        // Export as PNG (default)
        const imageURL = await vegaView.toImageURL("png", scaleFactor);
        this.downloadDataURL(imageURL, `${fullFilename}.png`);
      }
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      this.setState({ exporting: false });
    }
  };

  downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  downloadDataURL = (dataURL, filename) => {
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  handleMouseEnter = () => {
    this.setState({ isHovered: true });
  };

  handleMouseLeave = () => {
    this.setState({ isHovered: false });
  };

  render() {
    const { vegaView, format = "png", label, style = {} } = this.props;
    const { exporting, isHovered } = this.state;

    const isDisabled = !vegaView || exporting;
    const buttonLabel = label || (format === "svg" ? "SVG" : "PNG");
    const Icon = format === "svg" ? FiDownload : FiImage;

    // Determine background color based on state
    let backgroundColor = "#fff";
    if (isDisabled) {
      backgroundColor = "#f5f5f5";
    } else if (isHovered) {
      backgroundColor = "#f5f5f5";
    }

    return (
      <button
        onClick={this.handleExport}
        disabled={isDisabled}
        onMouseEnter={this.handleMouseEnter}
        onMouseLeave={this.handleMouseLeave}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          fontSize: 12,
          border: "1px solid #ccc",
          borderRadius: 4,
          backgroundColor,
          color: isDisabled ? "#999" : "#333",
          cursor: isDisabled ? "not-allowed" : "pointer",
          transition: "all 0.15s ease",
          ...style
        }}
        title={`Export as ${format.toUpperCase()}`}
      >
        <Icon size={14} />
        <span>{exporting ? "Exporting..." : buttonLabel}</span>
      </button>
    );
  }
}

/**
 * Export toolbar with PNG and SVG buttons
 */
export function VegaExportToolbar({ vegaView, filename, style = {} }) {
  return (
    <div
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        ...style
      }}
    >
      <span style={{ fontSize: 12, color: "#666", marginRight: 4 }}>Export:</span>
      <VegaExportButton vegaView={vegaView} filename={filename} format="png" />
      <VegaExportButton vegaView={vegaView} filename={filename} format="svg" />
    </div>
  );
}

export default VegaExportButton;
