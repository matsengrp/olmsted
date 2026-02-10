/* eslint no-console: off */
const path = require("path");

/**
 * Validates a file path to prevent path traversal attacks.
 * @param {string} filePath - The file path to validate
 * @throws {Error} If the path contains traversal sequences or is absolute
 */
const validateFilePath = (filePath) => {
  if (!filePath) {
    throw new Error("File path is required");
  }
  if (filePath.includes("..") || filePath.includes("\\")) {
    throw new Error("Invalid file path: path traversal detected");
  }
  if (filePath.startsWith("/")) {
    throw new Error("Invalid file path: absolute paths not allowed");
  }
};

/**
 * Fetches remote data and sends it to the response.
 * Uses native fetch (Node 18+) to replace deprecated 'request' package.
 * @param {string} url - The URL to fetch
 * @param {Object} res - Express response object
 */
const fetchAndSend = async (url, res) => {
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
    console.error(`Error fetching ${url}:`, error);
    res.status(500).send("Failed to fetch remote data");
  }
};

/**
 * Retrieves a data file from local filesystem or remote S3 storage.
 * @param {Object} res - Express response object
 * @param {string} filePath - Path to the data file
 * @param {string} s3 - S3 environment ('staging' or 'live')
 */
const getDataFile = async (res, filePath, s3) => {
  if (global.LOCAL_DATA) {
    res.sendFile(path.resolve(global.LOCAL_DATA_PATH, filePath));
  } else if (s3 === "staging") {
    await fetchAndSend(global.REMOTE_DATA_STAGING_BASEURL + filePath, res);
  } else {
    // Default to live S3 data
    await fetchAndSend(global.REMOTE_DATA_LIVE_BASEURL + filePath, res);
  }
};

const getDatasets = async (query, res) => {
  await getDataFile(res, "datasets.json", query.s3);
};

const getClonalFamilies = async (query, res) => {
  await getDataFile(res, "clones.json", query.s3);
};

const getSplashImage = async (query, res) => {
  try {
    validateFilePath(query.src);
    await getDataFile(res, query.src, query.s3);
  } catch (error) {
    res.status(400).send(`Invalid request: ${error.message}`);
  }
};

const getDatasetJson = async (query, res) => {
  try {
    validateFilePath(query.path);
    await getDataFile(res, query.path, query.s3);
  } catch (error) {
    res.status(400).send(`Invalid request: ${error.message}`);
  }
};

module.exports = {
  getDatasets,
  getClonalFamilies,
  getSplashImage,
  getDatasetJson,
};
