import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { FiClipboard, FiCheck } from "react-icons/fi";

const buttonStyle = {
  padding: "6px 12px",
  color: "#333",
  cursor: "pointer"
};

class CopyButton extends React.Component {
  constructor(props) {
    super(props);
    const { value } = props;
    this.state = {
      value,
      copied: false
    };
  }

  componentDidUpdate(prevProps) {
    const { value } = this.props;
    // Typical usage (don't forget to compare props):
    if (value !== prevProps.value) {
      this.setState({ value: value, copied: false });
    }
  }

  render() {
    const { buttonLabel } = this.props;
    const { value, copied } = this.state;
    return (
      <div>
        <CopyToClipboard text={value} onCopy={() => this.setState({ copied: true })}>
          <button type="button" style={buttonStyle}>
            <FiClipboard style={{ marginRight: "6px", verticalAlign: "middle" }} />
            {buttonLabel}
          </button>
        </CopyToClipboard>
        {copied ? (
          <span style={{ color: "green", marginLeft: "8px" }}>
            <FiCheck style={{ verticalAlign: "middle" }} /> Copied!
          </span>
        ) : null}
      </div>
    );
  }
}

export default CopyButton;
