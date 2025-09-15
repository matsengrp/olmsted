import React from "react";
import { connect } from "react-redux";
import { titleFont, medGrey } from "../../globalStyles";

@connect((state) => {
  return {
    browserDimensions: state.browserDimensions.browserDimensions
  };
})
class Title extends React.Component {
  getStyles() {
    const { browserDimensions } = this.props;
    let fontSize = 106;
    if (browserDimensions.width < 500) {
      fontSize = 84;
    }
    if (browserDimensions.width < 450) {
      fontSize = 78;
    }
    if (browserDimensions.width < 400) {
      fontSize = 72;
    }
    if (browserDimensions.width < 350) {
      fontSize = 66;
    }
    return {
      title: {
        fontFamily: titleFont,
        fontSize: fontSize,
        marginTop: 0,
        marginBottom: 0,
        fontWeight: 300,
        color: medGrey,
        letterSpacing: "-1px"
      }
    };
  }

  createTitle() {
    return <span style={{ color: "#05337f" }}>Olmsted</span>;
  }

  render() {
    const { style } = this.props;
    const styles = this.getStyles();
    return <span style={{ ...styles.title, ...style }}>{this.createTitle()}</span>;
  }
}

export default Title;
