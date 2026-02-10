module.exports = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(lodash-es|d3-array|d3-axis|d3-brush|d3-collection|d3-color|d3-ease|d3-interpolate|d3-scale|d3-selection|d3-shape|d3-time-format|d3-timer|d3-zoom|d3-dispatch|d3-drag|d3-dsv|d3-format|d3-path|d3-time|d3-transition|internmap|delaunator|robust-predicates)/)"
  ],
  moduleNameMapper: {
    "\\.(css|less|scss)$": "identity-obj-proxy",
    "\\.(jpg|jpeg|png|gif|svg|eot|otf|webp|ttf|woff|woff2)$": "<rootDir>/__mocks__/fileMock.js",
    "^vega-lib$": "vega"
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  setupFilesAfterEnv: ["@testing-library/jest-dom"],
  testMatch: ["**/__tests__/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/index.js",
    "!src/**/index.js",
    "!src/css/**",
    "!src/images/**",
    "!src/__test-data__/**"
  ]
};
