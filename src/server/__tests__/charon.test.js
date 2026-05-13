/**
 * Route-level tests for src/server/charon.js
 *
 * The charon module wires `/charon/*` requests to the appropriate
 * getFiles handler based on the `request` query parameter. We capture
 * the handler registered with the mock Express app and invoke it
 * directly with various query strings.
 */

jest.mock("../getFiles", () => ({
  getDatasets: jest.fn(async () => {}),
  getClonalFamilies: jest.fn(async () => {}),
  getSplashImage: jest.fn(async () => {}),
  getDatasetJson: jest.fn(async () => {})
}));

const getFiles = require("../getFiles");
const charon = require("../charon");

const makeRes = () => ({
  status: jest.fn().mockReturnThis(),
  send: jest.fn(),
  headersSent: false
});

// Capture the handler registered for the /charon route.
const captureHandler = () => {
  let handler;
  charon.applyCharonToApp({
    get: (_path, fn) => {
      handler = fn;
    }
  });
  return handler;
};

describe("charon route", () => {
  let handler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = captureHandler();
  });

  it.each([
    ["datasets", "getDatasets"],
    ["clonalFamilies", "getClonalFamilies"],
    ["splashimage", "getSplashImage"],
    ["json", "getDatasetJson"]
  ])("dispatches request=%s to %s", async (request, handlerName) => {
    const res = makeRes();
    await handler({ originalUrl: `/charon?request=${request}`, url: `/charon?request=${request}` }, res);
    expect(getFiles[handlerName]).toHaveBeenCalledTimes(1);
  });

  it("passes the parsed query through to the handler", async () => {
    const res = makeRes();
    const url = "/charon?request=json&path=clones.fixture-dataset-001.json&s3=staging";
    await handler({ originalUrl: url, url }, res);
    expect(getFiles.getDatasetJson).toHaveBeenCalledWith(
      expect.objectContaining({
        request: "json",
        path: "clones.fixture-dataset-001.json",
        s3: "staging"
      }),
      res
    );
  });

  it("silently ignores requests with no `request` query param", async () => {
    const res = makeRes();
    await handler({ originalUrl: "/charon", url: "/charon" }, res);
    expect(getFiles.getDatasets).not.toHaveBeenCalled();
    expect(getFiles.getClonalFamilies).not.toHaveBeenCalled();
    expect(getFiles.getSplashImage).not.toHaveBeenCalled();
    expect(getFiles.getDatasetJson).not.toHaveBeenCalled();
  });

  it("silently ignores requests with an unknown `request` value", async () => {
    const res = makeRes();
    await handler({ originalUrl: "/charon?request=unknown", url: "/charon?request=unknown" }, res);
    expect(getFiles.getDatasets).not.toHaveBeenCalled();
    expect(getFiles.getClonalFamilies).not.toHaveBeenCalled();
  });

  it("returns 500 when the handler throws and headers haven't been sent", async () => {
    getFiles.getDatasets.mockImplementationOnce(async () => {
      throw new Error("oops");
    });
    const res = makeRes();
    await handler({ originalUrl: "/charon?request=datasets", url: "/charon?request=datasets" }, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Internal server error");
  });

  it("does not double-send when the handler throws after headers were sent", async () => {
    getFiles.getDatasets.mockImplementationOnce(async () => {
      throw new Error("oops");
    });
    const res = { ...makeRes(), headersSent: true };
    await handler({ originalUrl: "/charon?request=datasets", url: "/charon?request=datasets" }, res);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
