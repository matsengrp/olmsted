/* eslint no-console: off */
const path = require("path");
const express = require("express");
const expressStaticGzip = require("express-static-gzip");
const charon = require("./src/server/charon");
const globals = require("./src/server/globals");
var exec = require('exec');

/* documentation in the static site! */

const devServer = process.argv.indexOf("dev") !== -1;
globals.setGlobals({
  localData: process.argv.indexOf("localData") !== -1
});

/* if we are in dev-mode, we need to import specific libraries & set flags */

const app = express();
app.set('port', process.env.PORT || 4000);

// gzip all files matching *.clonal_families.json in the data dir
exec(['find', 'data', '-name', '*.clonal_families.json',  '-exec', 'gzip', '-k9f', '{}', ';'], function(err, out, code) {
  if (err instanceof Error)
    throw err;
  process.stderr.write(err);
  process.stdout.write(out);
});

// gzip data/datasets.json
exec(['gzip', '-k9f', 'data/datasets.json'], function(err, out, code) {
  if (err instanceof Error)
    throw err;
  process.stderr.write(err);
  process.stdout.write(out);
});


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
  let webpackConfig = require(process.env.WEBPACK_CONFIG ? process.env.WEBPACK_CONFIG : './webpack.config.dev');

  const compiler = webpack(webpackConfig);

  app.use(require("webpack-dev-middleware")(compiler, {
    logLevel: 'warn', publicPath: webpackConfig.output.publicPath
  }));

  app.use(require("webpack-hot-middleware")(compiler, {
    log: console.log, path: '/__webpack_hmr', heartbeat: 10 * 1000
  }));

  // Change this to zip data instead of dist
  app.use("/charon", expressStaticGzip("data", options));
  app.use(express.static(path.join(__dirname, "dist")));

} else {
  // zip up the source code for production
  app.use("/dist", expressStaticGzip("dist"));
  app.use(express.static(path.join(__dirname, "dist")));
}

/* redirect www.nextstrain.org to nextstrain.org */
app.use(require('express-naked-redirect')({reverse: true}));

app.get("/favicon.png", (req, res) => {
  res.sendFile(path.join(__dirname, "favicon.png"));
});

// charon.applyCharonToApp(app);

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(app.get('port'), () => {
  console.log("-----------------------------------");
  console.log("Olmsted server started on port " + server.address().port);
  console.log(devServer ? "Serving dev bundle with hot-reloading enabled" : "Serving compiled bundle from /dist");
  console.log(global.LOCAL_DATA ? "Data is being sourced from /data" : "Dataset JSONs are being sourced from S3, narratives via the static github repo");
  console.log("-----------------------------------\n\n");
});
