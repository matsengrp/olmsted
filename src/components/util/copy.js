import React from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

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
          <button type="button">{buttonLabel}</button>
        </CopyToClipboard>

        {copied ? <span style={{ color: "red" }}>Copied!</span> : null}
      </div>
    );
  }
}

export default CopyButton;
