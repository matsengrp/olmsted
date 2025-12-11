import React from "react";
import { FiDownload } from "react-icons/fi";

const buttonStyle = {
  padding: "6px 12px",
  color: "#333",
  cursor: "pointer"
};

const linkStyle = {
  textDecoration: "none"
};

class DownloadText extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.textFile = null;
    this.defaultFilename = "download.txt";
    this.defaultLabel = "Download";
  }

  createTextDownload(text) {
    const data = new Blob([text], { type: "text/plain" });
    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (this.textFile !== null) {
      window.URL.revokeObjectURL(this.textFile);
    }

    this.textFile = window.URL.createObjectURL(data);

    return this.textFile;
  }

  render() {
    const { text, filename, label } = this.props;
    return (
      <a
        href={this.createTextDownload(text)}
        download={filename ? filename : this.defaultFilename}
        style={linkStyle}
      >
        <button type="button" style={buttonStyle}>
          <FiDownload style={{ marginRight: "6px", verticalAlign: "middle" }} />
          {label ? label : this.defaultLabel}
        </button>
      </a>
    );
  }
}

export default DownloadText;
