import React from "react";

class DownloadFasta extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.createFastaDownload = this.createFastaDownload.bind(this);
    this.textFile = null
    this.defaultFilename = "sequences.fasta"
    this.defaultLabel = "Download Fasta"
  }

  createFastaDownload(seqRecords){
    let text = _.reduce(seqRecords, (fastaString, seqRecord) => fastaString.concat('>', seqRecord.id, '\n', seqRecord.nt_seq, '\n'), '')
    var data = new Blob([text], {type: 'text/plain'});
    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (this.textFile !== null) {
      window.URL.revokeObjectURL(this.textFile);
    }

    this.textFile = window.URL.createObjectURL(data);

    return this.textFile;
  }

  render(){
    return <button id="create">
            <a href={this.createFastaDownload(this.props.sequencesSet)}
               download={this.props.filename? this.props.filename : this.defaultFilename}
               id="downloadlink" 
              >{this.props.label? this.props.label: this.defaultLabel}</a>
           </button> 
  }
}

export default DownloadFasta