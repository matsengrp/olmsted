import React from "react";
import DownloadText from "../util/downloadtext";

class DownloadFasta extends React.Component {
  constructor(props) {
    super(props);
    // This binding is necessary to make `this` work in the callback
    this.createFastaDownload = this.createFastaDownload.bind(this);
  }

  createFastaDownload(seqRecords){
    return _.reduce(seqRecords, (fastaString, seqRecord) => fastaString.concat('>', seqRecord.id, '\n', seqRecord.dna_seq, '\n'), '')    
  }

  render(){
    return <DownloadText text={this.createFastaDownload(this.props.sequencesSet)}
                         filename={this.props.filename}
                         label={this.props.label}/>
  }
}

export default DownloadFasta
