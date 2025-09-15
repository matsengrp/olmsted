import React from "react";

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
    return (
      <a
        href={this.createTextDownload(this.props.text)}
        download={this.props.filename ? this.props.filename : this.defaultFilename}
        id="downloadlink"
      >
        <button type="button" id="create">{this.props.label ? this.props.label : this.defaultLabel}</button>
      </a>
    );
  }
}

export default DownloadText;
