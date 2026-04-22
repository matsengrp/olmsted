const { app, BrowserWindow } = require("electron");
const path = require("path");
const url = require("url");
const http = require("http");
const express = require("express");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

app.on("ready", function () {
  // port this code from server.js
  // from https://gist.github.com/maximilian-ruppert/a446a7ee87838a62099d
  var expressApp = express();

  //register static directories
  expressApp.use("/dist", express.static(path.join(__dirname, "dist")));
  expressApp.use("/data", express.static(path.join(__dirname, "data")));

  // Express 5 requires named wildcards. `{*splat}` makes the splat optional
  // so that the pattern matches the root path `/` in addition to nested paths.
  expressApp.get("/{*splat}", function (req, res) {
    // `send` (used by sendFile) has stricter path validation in Express 5 and
    // rejects absolute paths inside Electron's asar archive; passing `root`
    // + a relative filename avoids that code path.
    res.sendFile("index.html", { root: __dirname });
  });

  // Start the Express App
  http.createServer(expressApp).listen(5000);

  //setup the main window
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    useContentSize: true,
    resizable: true
  });

  // run the express app in that window
  mainWindow.loadURL("http://localhost:5000/");
  mainWindow.focus();
});
