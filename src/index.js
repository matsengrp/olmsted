/* eslint-disable import/first */
/* P O L Y F I L L S */
import "./util/polyfills"; // eslint-disable-line
/* L I B R A R I E S */
import React from "react";
import { createRoot } from 'react-dom/client';
import { Provider } from "react-redux";
import configureStore from "./store";
/* S T Y L E S H E E T S */
import "./css/global.css";
import "./css/browserCompatability.css";
import "./css/bootstrapCustomized.css";
import "./css/static.css";


const store = configureStore();

/*
Using React Hot Loader 4
https://github.com/gaearon/react-hot-loader
*/

let root;

const renderApp = () => {
  const Root = require("./Root").default;
  const container = document.getElementById('root');
  
  if (!root) {
    root = createRoot(container);
  }
  
  root.render(
    <Provider store={store}>
      <Root />
    </Provider>
  );
};

if (process.env.NODE_ENV !== 'production' && module.hot) {
  console.log("hot component reload");
  module.hot.accept("./Root", () => {
    renderApp();
  });
}

renderApp();
