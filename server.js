/* eslint no-console: off */
const path = require("path");
const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const globals = require("./src/server/globals");
const { execFile } = require('child_process');

/* documentation in the static site! */

// call like `npm start localData` or `npm start localData testdata` for a specific dir
const devServer = process.argv.indexOf("dev") !== -1;
let localDataIndex = process.argv.indexOf("localData")
let localData = localDataIndex !== -1;
let localDataPath = localData ? (process.argv[localDataIndex + 1]) || "example_data/build_data" : undefined
let port = (process.argv[localDataIndex + 2]) || 3999
globals.setGlobals({localData, localDataPath})


/* if we are in dev-mode, we need to import specific libraries & set flags */

const app = express();
app.set('port', process.env.PORT || port);



var options = {
  dotfiles: 'ignore',
  etag: false,
  extensions: ['gz'],
  index: false,
  maxAge: '1d',
  redirect: false,
  setHeaders: function (res, path, stat) {
    res.set('Cache-Control', 'private')
  }
}


if (devServer) {

  let webpack = require("webpack"); // eslint-disable-line
  // Use dynamic require to avoid webpack bundling dev config in production
  const configPath = process.env.WEBPACK_CONFIG || './webpack.config.dev';
  let webpackConfig = require(configPath);

  const compiler = webpack(webpackConfig);

  app.use(require("webpack-dev-middleware")(compiler, {
    publicPath: webpackConfig.output.publicPath
  }));

  app.use(require("webpack-hot-middleware")(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000
  }));

  // Change this to zip data instead of dist
  if (global.LOCAL_DATA_PATH) {
    app.use("/data", expressStaticGzip(global.LOCAL_DATA_PATH, options));
  }
  app.use(express.static(path.join(__dirname, "dist")));

} else {
  // zip up the source code for production
  app.use("/dist", expressStaticGzip("_deploy/dist"));
  app.use(express.static(path.join(__dirname, "_deploy/dist")));
}

/* redirect www.nextstrain.org to nextstrain.org */
app.use(require('express-naked-redirect')({reverse: true}));

app.get("/favicon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "favicon.png"));
});


app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(app.get('port'), () => {
  console.log("-----------------------------------");
  console.log("Olmsted server started on port " + server.address().port);
  console.log(devServer ? "Serving dev bundle with hot-reloading enabled" : "Serving compiled bundle from /dist");
  console.log(global.LOCAL_DATA ? "Data is being sourced from " + global.LOCAL_DATA_PATH : "Dataset JSONs are being sourced from S3, narratives via the static github repo");
  console.log("-----------------------------------\n\n");
});
