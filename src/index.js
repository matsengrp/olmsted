/* eslint-disable import/first */
/* P O L Y F I L L S */
import "./util/polyfills"; // eslint-disable-line
/* L I B R A R I E S */
import React from "react";
import ReactDOM from "react-dom";
import { connect, Provider } from "react-redux";
import { AppContainer } from 'react-hot-loader';
import injectTapEventPlugin from "react-tap-event-plugin";
import Monitor from "./components/framework/monitor";
import App from "./components/explorer/app";
import Splash from "./components/splash/index";
import configureStore from "./store";
import NavBar from "./components/framework/nav-bar";
import { CenterContent } from "./components/splash/centerContent";
import { logos } from "./components/splash/logos";
/* S T Y L E S H E E T S */
import "./css/global.css";
import "./css/browserCompatability.css";
import "./css/bootstrapCustomized.css";
import "./css/static.css";
import "./css/boxed.css";
import "./css/select.css";

const store = configureStore();

// ROUTING
@connect((state) => ({displayComponent: state.datasets.displayComponent}))
class MainComponentSwitch extends React.Component {
  render() {
    // console.log("MainComponentSwitch running (should be infrequent!)", this.props.displayComponent)
    switch (this.props.displayComponent) {
      // splash & dataset selector
      case "splash": return (<Splash/>);
      case "app" : return (<App/>);
      default:
        console.error(`reduxStore.datasets.displayComponent is invalid (${this.props.displayComponent})`);
        return (<Splash/>);
    }
  }
}

const Root = () => {
  return (
    <Provider store={store}>
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
    </Provider>
  );
};

/*
React Hot Loader 3  fixes some long-standing issues with both React Hot Loader and React Transform.
https://github.com/gaearon/react-hot-loader
*/
const render = (Component) => {
  ReactDOM.render(
    <AppContainer>
      <Component />
    </AppContainer>,
    document.getElementById('root')
  );
};
render(Root);
if (module.hot) {
  module.hot.accept();
}

/*  to fix iOS's dreaded 300ms tap delay, we need this plugin
NOTE Facebook is not planning on supporting tap events (#436) because browsers are fixing/removing
the click delay. Unfortunately it will take a lot of time before all mobile
browsers (including iOS' UIWebView) will and can be updated.
https://github.com/zilverline/react-tap-event-plugin

Following https://github.com/zilverline/react-tap-event-plugin/issues/61
we wrap this in a try-catch as hotloading triggers errors */
try {
  injectTapEventPlugin();
} catch (e) {
  // empty
}
