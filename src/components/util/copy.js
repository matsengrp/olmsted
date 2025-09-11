import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

class CopyButton extends React.Component {
  state = {
    value: this.props.value,
    copied: false
  };

  componentDidUpdate(prevProps) {
    // Typical usage (don't forget to compare props):
    if (this.props.value !== prevProps.value) {
      this.setState({ value: this.props.value, copied: false });
    }
  }

  render() {
    return (
      <div>
        <CopyToClipboard text={this.state.value} onCopy={() => this.setState({ copied: true })}>
          <button>{this.props.buttonLabel}</button>
        </CopyToClipboard>

        {this.state.copied ? <span style={{ color: "red" }}>Copied!</span> : null}
      </div>
    );
  }
}

export default CopyButton;
