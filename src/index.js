/* eslint-disable import/first */
/* P O L Y F I L L S */
import "./util/polyfills"; // eslint-disable-line
/* L I B R A R I E S */
import React from "react";
import { render } from 'react-dom'
import { Provider } from "react-redux";
import injectTapEventPlugin from "react-tap-event-plugin";
import configureStore from "./store";
/* S T Y L E S H E E T S */
import "./css/global.css";
import "./css/browserCompatability.css";
import "./css/bootstrapCustomized.css";
import "./css/static.css";
import "./css/boxed.css";
import "./css/select.css";


const store = configureStore();

/*
Using React Hot Loader 4
https://github.com/gaearon/react-hot-loader
*/


const renderApp = () => {
  const Root = require("./Root").default;
  render(
    <Provider store={store}>
      <Root />
    </Provider>,
    document.getElementById('root')
  );
};

if (process.env.NODE_ENV !== 'production' && module.hot) {
  console.log("hot component reload")
  module.hot.accept("./Root", () => {
    renderApp()
  })
}

renderApp()

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
