/* eslint no-console: off */
const path = require("path");

/**
 * Fetches remote data and pipes it to the response.
 * Uses native fetch (Node 18+) to replace deprecated 'request' package.
 * @param {string} url - The URL to fetch
 * @param {Object} res - Express response object
 */
const fetchAndPipe = async (url, res) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      res.status(response.status).send(`Failed to fetch: ${response.statusText}`);
      return;
    }
    res.set("Content-Type", response.headers.get("content-type") || "application/json");
    const buffer = Buffer.from(await response.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    res.status(500).send("Failed to fetch remote data");
  }
};

/**
 * Retrieves a data file from local filesystem or remote S3 storage.
 * @param {Object} res - Express response object
 * @param {string} filePath - Path to the data file
 * @param {string} s3 - S3 environment ('staging' or 'live')
 */
const getDataFile = (res, filePath, s3) => {
  if (global.LOCAL_DATA) {
    res.sendFile(path.resolve(global.LOCAL_DATA_PATH, filePath));
  } else if (s3 === "staging") {
    fetchAndPipe(global.REMOTE_DATA_STAGING_BASEURL + filePath, res);
  } else {
    // Default to live S3 data
    fetchAndPipe(global.REMOTE_DATA_LIVE_BASEURL + filePath, res);
  }
};

const getDatasets = (query, res) => {
  // If you wanna be picky about having users
  // if (Object.keys(query).indexOf("user") === -1) {
  // res.status(404).send('No user defined');
  // return;
  // }
  getDataFile(res, "datasets.json", query.s3);
};

const getClonalFamilies = (query, res) => {
  getDataFile(res, "clones.json", query.s3);
};

const getSplashImage = (query, res) => {
  getDataFile(res, query.src, query.s3);
};

// const getImage = (query, res) => {
//   getStaticFile(res, query.src);
// };

const getDatasetJson = (query, res) => {
  getDataFile(res, query.path, query.s3);
};

module.exports = {
  getDatasets,
  getClonalFamilies,
  getSplashImage,
  // getImage,
  getDatasetJson
};
