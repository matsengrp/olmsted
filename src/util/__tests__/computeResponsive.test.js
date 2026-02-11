import { calcUsableWidth, computeResponsive } from "../computeResponsive";

describe("calcUsableWidth", () => {
  it("uses single-card padding when fraction is 1", () => {
    // xPaddingOneCard = 40
    expect(calcUsableWidth(1000, 1)).toBe(1 * (1000 - 40));
  });

  it("uses two-card padding when fraction is 0.5", () => {
    // xPaddingTwoCards = 65
    expect(calcUsableWidth(1000, 0.5)).toBe(0.5 * (1000 - 65));
  });

  it("scales proportionally with fraction", () => {
    const full = calcUsableWidth(1000, 1);
    const half = calcUsableWidth(1000, 0.5);
    // Half should be roughly half of full (different padding though)
    expect(half).toBeLessThan(full);
    expect(half).toBeGreaterThan(0);
  });
});

describe("computeResponsive", () => {
  const baseParams = {
    horizontal: 1,
    vertical: 1,
    availableWidth: 1000,
    availableHeight: 800
  };

  it("computes width and height for full-screen panel", () => {
    const result = computeResponsive(baseParams);
    // width = 1 * (1000 - 40) = 960
    // height = 1 * 800 - 52 = 748
    expect(result.width).toBe(960);
    expect(result.height).toBe(748);
  });

  it("computes dimensions for half-width panel", () => {
    const result = computeResponsive({ ...baseParams, horizontal: 0.5 });
    // width = 0.5 * (1000 - 65) = 467.5
    // height = 1 * 800 - 52 = 748
    expect(result.width).toBe(467.5);
    expect(result.height).toBe(748);
  });

  it("computes dimensions for half-height panel", () => {
    const result = computeResponsive({ ...baseParams, vertical: 0.5 });
    // height = 0.5 * 800 - 52 = 348
    expect(result.height).toBe(348);
  });

  it("enforces minHeight", () => {
    const result = computeResponsive({
      ...baseParams,
      vertical: 0.1,
      minHeight: 200
    });
    // computed height = 0.1 * 800 - 52 = 28, but minHeight = 200
    expect(result.height).toBe(200);
  });

  it("enforces maxAspectRatio", () => {
    const result = computeResponsive({
      ...baseParams,
      maxAspectRatio: 0.5
    });
    // width = 960, maxHeight = 0.5 * 960 = 480
    // computed height = 748, so capped to 480
    expect(result.height).toBe(480);
  });

  it("favors minHeight over maxAspectRatio", () => {
    const result = computeResponsive({
      ...baseParams,
      maxAspectRatio: 0.1, // would cap height to 96
      minHeight: 300 // but minHeight overrides
    });
    expect(result.height).toBe(300);
  });
});
