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

    /**
     * Keyboard handler for clickable Flex containers
     * WCAG 2.1.1: All interactive elements must be keyboard accessible
     * Only applies when clickHandler prop is provided
     */
    const handleKeyDown = clickHandler ? (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        clickHandler(e);
      }
    } : undefined;

    // Only add interactive attributes if there's a click handler
    const interactiveProps = clickHandler ? {
      onClick: clickHandler,
      onKeyDown: handleKeyDown,
      role: "button",
      tabIndex: 0,
      style: { ...styles.base, ...styles.style, cursor: 'pointer' }
    } : {
      style: { ...styles.base, ...styles.style }
    };

    return (
      <div {...interactiveProps}>
        {children}
      </div>
    );
  }
}

export default Flex;
