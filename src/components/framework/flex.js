import React from "react";
import PropTypes from "prop-types";

/*

  flex-direction: row | row-reverse | column | column-reverse;
  flex-wrap: nowrap | wrap | wrap-reverse;
  justify-content: flex-start | flex-end | center | space-between | space-around;
  align-items: flex-start | flex-end | center | baseline | stretch;
  align-content: flex-start | flex-end | center | space-between | space-around | stretch;
  flex is growShrinkBasis

*/

class Flex extends React.Component {
  static propTypes = {
    direction: PropTypes.oneOf(["row", "rowReverse", "column", "columnReverse"]),
    wrap: PropTypes.oneOf(["nowrap", "wrap", "wrap-reverse"]),
    justifyContent: PropTypes.oneOf(["flex-start", "flex-end", "center", "space-between", "space-around"]),
    alignItems: PropTypes.oneOf(["flex-start", "flex-end", "center", "baseline", "stretch"]),
    alignContent: PropTypes.oneOf(["flex-start", "flex-end", "center", "space-between", "space-around", "stretch"]),
    grow: PropTypes.number,
    shrink: PropTypes.number,
    basis: PropTypes.string,
    order: PropTypes.number,
    alignSelf: PropTypes.oneOf(["auto", "flex-start", "flex-end", "center", "baseline", "stretch"]),
    styleOverrides: PropTypes.object,
    children: PropTypes.node,
    clickHandler: PropTypes.func
  };

  static defaultProps = {
    direction: "row",
    wrap: "nowrap",
    justifyContent: "center",
    alignItems: "center",
    alignContent: "stretch",
    grow: 0,
    shrink: 1,
    basis: "auto",
    alignSelf: "auto",
    order: 0,
    style: {}
  };

  getStyles() {
    const {
      direction, wrap, justifyContent, alignItems, alignContent, order, grow, shrink, basis, alignSelf, style
    } = this.props;
    return {
      base: {
        display: "flex",
        flexDirection: direction,
        flexWrap: wrap,
        justifyContent: justifyContent,
        alignItems: alignItems,
        alignContent: alignContent,
        order: order,
        flexGrow: grow,
        flexShrink: shrink,
        flexBasis: basis,
        alignSelf: alignSelf
      },
      style: style
    };
  }

  render() {
    const { clickHandler, children } = this.props;
    const styles = this.getStyles();

    return (
      <div onClick={clickHandler} style={{ ...styles.base, ...styles.style }}>
        {children}
      </div>
    );
  }
}

export default Flex;
