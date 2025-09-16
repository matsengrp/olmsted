import React from "react";
// import PropTypes from 'prop-types';
import { connect } from "react-redux";
import Flex from "./flex";
import SidebarChevron from "./sidebar-chevron";
import { darkGrey, brandColor } from "../../globalStyles";
import { changePage } from "../../actions/navigation";

@connect((state) => {
  return {
    browserDimensions: state.browserDimensions.browserDimensions
  };
})
class NavBar extends React.Component {
  constructor(props) {
    super(props);
  }

  getStyles() {
    const { minified } = this.props;
    return {
      main: {
        marginTop: "10px",
        marginRight: "18px",
        marginBottom: "20px",
        marginLeft: "18px",
        height: 50,
        justifyContent: "space-between",
        alignItems: "center",
        overflow: "hidden",
        left: 0,
        zIndex: 1001,
        transition: "left .3s ease-out"
      },
      logo: {
        paddingLeft: "8px",
        paddingRight: "8px",
        paddingTop: "20px",
        paddingBottom: "20px",
        color: "#000",
        cursor: "pointer",
        textDecoration: "none",
        fontSize: minified ? 12 : 16
      },
      title: {
        padding: "5px",
        marginTop: 5,
        color: "#000",
        textDecoration: "none",
        fontSize: 27,
        fontWeight: 400,
        cursor: "pointer"
      },
      link: {
        paddingLeft: minified ? "6px" : "12px",
        paddingRight: minified ? "6px" : "12px",
        paddingTop: "20px",
        paddingBottom: "20px",
        textDecoration: "none",
        cursor: "pointer",
        fontSize: minified ? 12 : 16,
        fontWeight: 400,
        textTransform: "uppercase"
      },
      inactive: {
        paddingLeft: minified ? "6px" : "12px",
        paddingRight: minified ? "6px" : "12px",
        paddingTop: "20px",
        paddingBottom: "20px",
        color: "#5097BA",
        textDecoration: "none",
        fontSize: minified ? 12 : 16,
        fontWeight: 400,
        textTransform: "uppercase"
      },
      alerts: {
        textAlign: "center",
        verticalAlign: "middle",
        width: 70,
        color: brandColor
      }
    };
  }

  getLogo(styles) {
    const { dispatch } = this.props;
    /**
     * Logo link keyboard handler
     * WCAG 2.1.1: Navigation elements must be keyboard accessible
     * Using href="#" with preventDefault for proper link semantics
     */
    const handleLogoClick = (e) => {
      e.preventDefault();
      dispatch(changePage({ path: "splash" }));
    };
    const handleLogoKeyDown = (e) => {
      if (e.key === 'Enter') { // Links naturally respond to Enter, not Space
        e.preventDefault();
        dispatch(changePage({ path: "splash" }));
      }
    };
    return (
      <button
        type="button"
        style={{ ...styles.logo, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
        onClick={handleLogoClick}
        onKeyDown={handleLogoKeyDown}
        aria-label="Olmsted home"
      >
        {/* eslint-disable-next-line global-require */}
        <img alt="" width="50" src={require("../../images/olmsted_logo.png")} />
      </button>
    );
  }

  getLogoType(styles) {
    const { minified, dispatch } = this.props;
    const title = <span style={{ color: "#05337f" }}>Olmsted</span>;
    return minified ? (
      <div />
    ) : (
      <button
        type="button"
        style={{ ...styles.title, border: 'none', background: 'none', padding: 0, cursor: 'pointer' }}
        onClick={(e) => {
          e.preventDefault();
          dispatch(changePage({ path: "splash" }));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            dispatch(changePage({ path: "splash" }));
          }
        }}
        aria-label="Olmsted home"
      >
        {title}
      </button>
    );
  }

  getLink(name, path, styles) {
    const { minified, dispatch } = this.props;
    const linkCol = minified ? "#000" : darkGrey;
    return (
      <button
        type="button"
        style={{ ...{ color: linkCol }, ...styles.link, border: 'none', background: 'none', cursor: 'pointer' }}
        onClick={(e) => {
          e.preventDefault();
          dispatch(changePage({ path: path }));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            dispatch(changePage({ path: path }));
          }
        }}
      >
        {name}
      </button>
    );
  }

  getChevron() {
    const { minified, mobileDisplay, toggleHandler } = this.props;
    return minified ? <SidebarChevron mobileDisplay={mobileDisplay} handler={toggleHandler} /> : <div />;
  }

  render() {
    const { minified } = this.props;
    const styles = this.getStyles();
    return (
      <Flex style={styles.main}>
        {this.getLogo(styles)}
        {this.getLogoType(styles)}
        <div style={{ flex: 5 }} />
        {this.getChevron()}
        <div style={{ width: minified ? 8 : 0 }} />
      </Flex>
    );
  }
}

// include this as part of navbar when help page is complete on static
// {this.getLink("Help", "/help", styles)}

export default NavBar;
