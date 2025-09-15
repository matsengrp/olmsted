import React from "react";
import DownloadText from "../util/downloadText";

class DownloadFasta extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.createFastaDownload = this.createFastaDownload.bind(this);
  }

  createFastaDownload(seqRecords) {
    return seqRecords.reduce(
      (fastaString, seqRecord) => fastaString.concat(">", seqRecord.sequence_id, "\n", seqRecord.sequence_alignment, "\n"),
      ""
    );
  }

  render() {
    const { sequencesSet, filename, label } = this.props;
    return <DownloadText text={this.createFastaDownload(sequencesSet)} filename={filename} label={label} />;
  }
}

export default DownloadFasta;
