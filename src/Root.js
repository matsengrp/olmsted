import { connect } from "react-redux";
import React from "react";
import { hot } from 'react-hot-loader';
import App from "./components/explorer/app";
import Splash from "./components/splash/index";
import Monitor from "./components/framework/monitor";
import NavBar from "./components/framework/nav-bar";
import { logos } from "./components/splash/logos";
import { CenterContent } from "./components/splash/centerContent";


// ROUTING
@connect((state) => ({displayComponent: state.datasets.displayComponent}))
class MainComponentSwitch extends React.Component {
  render() {
    // console.log("MainComponentSwitch running (should be infrequent!)", this.props.displayComponent)
    switch (this.props.displayComponent) {
      // splash & dataset selector
      case "splash": return (<Splash/>);
      case "app": return (<App/>);
      default:
        console.error(`reduxStore.datasets.displayComponent is invalid (${this.props.displayComponent})`);
        return (<Splash/>);
    }
  }
}

class Root extends React.Component {
  render() {
    return (
      <div>
        <Monitor/>
        <NavBar/>
        <MainComponentSwitch/>
        <div className="static" style={{marginTop: 50}} >
          <CenterContent>
            {logos}
          </CenterContent>
        </div>
      </div>
    );
  }
}

export default hot(module)(Root);
