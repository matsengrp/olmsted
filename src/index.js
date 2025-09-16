/* eslint-disable import/first */
/* P O L Y F I L L S */
import "./util/polyfills"; // eslint-disable-line
/* L I B R A R I E S */
import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import configureStore from "./store";
/* S T Y L E S H E E T S */
import "./css/global.css";
import "./css/browserCompatability.css";
import "./css/bootstrapCustomized.css";
import "./css/static.css";

const store = configureStore();

/*
Using React Fast Refresh
React 18 with Fast Refresh for hot reloading
*/

const container = document.getElementById("root");
const root = createRoot(container);

const renderApp = () => {
  const Root = require("./Root").default;

  root.render(
    <Provider store={store}>
      <Root />
    </Provider>
  );
};

renderApp();
