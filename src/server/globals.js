const setGlobals = ({ localData = false, localDataPath = undefined } = {}) => {
  global.LOCAL_DATA = localData;
  global.LOCAL_DATA_PATH = localDataPath;
};

module.exports = {
  setGlobals
};
