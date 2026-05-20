import { DATASET_SOURCE, sourceOf, isUserUpload } from "../datasetSource";

describe("sourceOf", () => {
  it("prefers an explicit `source` field over derivation", () => {
    expect(sourceOf({ source: DATASET_SOURCE.SERVER_CONSOLIDATED, temporary: true, isClientSide: true })).toBe(
      DATASET_SOURCE.SERVER_CONSOLIDATED
    );
  });

  it("derives UPLOAD from temporary === true (legacy upload record)", () => {
    expect(sourceOf({ temporary: true, isClientSide: true })).toBe(DATASET_SOURCE.UPLOAD);
  });

  it("derives SERVER_CONSOLIDATED from temporary === false (legacy server-ingested record)", () => {
    expect(sourceOf({ temporary: false, isClientSide: true })).toBe(DATASET_SOURCE.SERVER_CONSOLIDATED);
  });

  it("returns SERVER_CONSOLIDATED for null/undefined inputs (defensive)", () => {
    expect(sourceOf(null)).toBe(DATASET_SOURCE.SERVER_CONSOLIDATED);
    expect(sourceOf(undefined)).toBe(DATASET_SOURCE.SERVER_CONSOLIDATED);
  });
});

describe("isUserUpload", () => {
  it("returns true only for UPLOAD-sourced datasets", () => {
    expect(isUserUpload({ source: DATASET_SOURCE.UPLOAD })).toBe(true);
    expect(isUserUpload({ source: DATASET_SOURCE.SERVER_CONSOLIDATED })).toBe(false);
  });

  it("derives correctly from legacy flags (record from before the enum landed)", () => {
    expect(isUserUpload({ temporary: true, isClientSide: true })).toBe(true);
    expect(isUserUpload({ temporary: false, isClientSide: true })).toBe(false);
  });
});
