const queryString = require("query-string");
const getFiles = require("./getFiles");

const applyCharonToApp = (app) => {
  app.get("/charon*", async (req, res) => {
    const query = queryString.parse(req.url.split("?")[1]);
    console.log("Charon API request: " + req.originalUrl);
    if (Object.keys(query).indexOf("request") === -1) {
      console.warn("Query rejected (nothing requested) -- " + req.originalUrl);
      return; // 404
    }
    try {
      switch (query.request) {
        case "datasets": {
          await getFiles.getDatasets(query, res);
          break;
        }
        case "clonalFamilies": {
          await getFiles.getClonalFamilies(query, res);
          break;
        }
        case "splashimage": {
          await getFiles.getSplashImage(query, res);
          break;
        }
        case "json": {
          await getFiles.getDatasetJson(query, res);
          break;
        }
        default: {
          console.warn("Query rejected (unknown want) -- " + req.originalUrl);
        }
      }
    } catch (error) {
      console.error("Charon API error:", error);
      if (!res.headersSent) {
        res.status(500).send("Internal server error");
      }
    }
  });
};

module.exports = {
  applyCharonToApp,
};
