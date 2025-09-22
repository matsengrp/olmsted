const queryString = require("query-string");
const getFiles = require("./getFiles");

const applyCharonToApp = (app) => {
  app.get("/charon*", (req, res) => {
    const query = queryString.parse(req.url.split("?")[1]);
    console.log("Charon API request: " + req.originalUrl);
    if (Object.keys(query).indexOf("request") === -1) {
      console.warn("Query rejected (nothing requested) -- " + req.originalUrl);
      return; // 404
    }
    switch (query.request) {
      case "datasets": {
        getFiles.getDatasets(query, res);
        break;
      }
      case "clonalFamilies": {
        getFiles.getClonalFamilies(query, res);
        break;
      }
      case "splashimage": {
        getFiles.getSplashImage(query, res);
        break;
        // } case "image": {
        //   getFiles.getImage(query, res);
        //   break;
      }
      case "json": {
        getFiles.getDatasetJson(query, res);
        break;
      }
      default: {
        console.warn("Query rejected (unknown want) -- " + req.originalUrl);
      }
    }
  });
};

module.exports = {
  applyCharonToApp
};
