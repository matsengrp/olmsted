/* eslint no-console: off */
// const fs = require('fs');
const path = require("path");
// const fetch = require('node-fetch'); // not needed for local data
const request = require("request");
// const prettyjson = require('prettyjson');

// const validUsers = ['guest', 'mumps', 'lassa'];

const getDataFile = (res, filePath, s3) => {
  if (global.LOCAL_DATA) {
    res.sendFile(path.join(global.LOCAL_DATA_PATH, filePath));
  } else if (s3 === "staging") {
    request(global.REMOTE_DATA_STAGING_BASEURL + filePath).pipe(res);
    /* TODO explore https://www.npmjs.com/package/cached-request */
  } else {
    // we deliberately don't ensure that s3===live, as this should be the default
    request(global.REMOTE_DATA_LIVE_BASEURL + filePath).pipe(res);
    /* TODO explore https://www.npmjs.com/package/cached-request */
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
