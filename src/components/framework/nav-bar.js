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
        fontSize: this.props.minified ? 12 : 16
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
        paddingLeft: this.props.minified ? "6px" : "12px",
        paddingRight: this.props.minified ? "6px" : "12px",
        paddingTop: "20px",
        paddingBottom: "20px",
        textDecoration: "none",
        cursor: "pointer",
        fontSize: this.props.minified ? 12 : 16,
        fontWeight: 400,
        textTransform: "uppercase"
      },
      inactive: {
        paddingLeft: this.props.minified ? "6px" : "12px",
        paddingRight: this.props.minified ? "6px" : "12px",
        paddingTop: "20px",
        paddingBottom: "20px",
        color: "#5097BA",
        textDecoration: "none",
        fontSize: this.props.minified ? 12 : 16,
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
    return (
      <a style={styles.logo} onClick={(_e) => this.props.dispatch(changePage({ path: "splash" }))}>
        <img alt="" width="50" src={require("../../images/olmsted_logo.png")} />
      </a>
    );
  }

  getLogoType(styles) {
    const title = <span style={{ color: "#05337f" }}>Olmsted</span>;
    return this.props.minified ? (
      <div />
    ) : (
      <a style={styles.title} onClick={(_e) => this.props.dispatch(changePage({ path: "splash" }))}>
        {title}
      </a>
    );
  }

  getLink(name, path, styles) {
    const linkCol = this.props.minified ? "#000" : darkGrey;
    return (
      <a
        style={{ ...{ color: linkCol }, ...styles.link }}
        onClick={(_e) => this.props.dispatch(changePage({ path: path }))}
      >
        {name}
      </a>
    );
  }

  getChevron() {
    return this.props.minified ? (
      <SidebarChevron mobileDisplay={this.props.mobileDisplay} handler={this.props.toggleHandler} />
    ) : (
      <div />
    );
  }

  render() {
    const styles = this.getStyles();
    return (
      <Flex style={styles.main}>
        {this.getLogo(styles)}
        {this.getLogoType(styles)}
        <div style={{ flex: 5 }} />
        {this.getChevron()}
        <div style={{ width: this.props.minified ? 8 : 0 }} />
      </Flex>
    );
  }
}

// include this as part of navbar when help page is complete on static
// {this.getLink("Help", "/help", styles)}

export default NavBar;
