import { DATASET_SOURCE, sourceOf, isDatasetInIndexedDB, isUserUpload } from "../datasetSource";

describe("sourceOf", () => {
  it("prefers an explicit `source` field over derivation", () => {
    expect(sourceOf({ source: DATASET_SOURCE.SERVER_CONSOLIDATED, temporary: true, isClientSide: true })).toBe(
      DATASET_SOURCE.SERVER_CONSOLIDATED
    );
  });

  it("derives UPLOAD from temporary + isClientSide both true (legacy upload record)", () => {
    expect(sourceOf({ temporary: true, isClientSide: true })).toBe(DATASET_SOURCE.UPLOAD);
  });

  it("derives SERVER_CONSOLIDATED from isClientSide alone (legacy server-ingested record)", () => {
    expect(sourceOf({ temporary: false, isClientSide: true })).toBe(DATASET_SOURCE.SERVER_CONSOLIDATED);
  });

  it("derives SERVER_SPLIT from neither flag set (legacy auspice manifest entry)", () => {
    expect(sourceOf({ isClientSide: false })).toBe(DATASET_SOURCE.SERVER_SPLIT);
    expect(sourceOf({})).toBe(DATASET_SOURCE.SERVER_SPLIT);
  });

  it("returns SERVER_SPLIT for null/undefined inputs (defensive)", () => {
    expect(sourceOf(null)).toBe(DATASET_SOURCE.SERVER_SPLIT);
    expect(sourceOf(undefined)).toBe(DATASET_SOURCE.SERVER_SPLIT);
  });
});

describe("isDatasetInIndexedDB", () => {
  it("returns true for UPLOAD and SERVER_CONSOLIDATED", () => {
    expect(isDatasetInIndexedDB({ source: DATASET_SOURCE.UPLOAD })).toBe(true);
    expect(isDatasetInIndexedDB({ source: DATASET_SOURCE.SERVER_CONSOLIDATED })).toBe(true);
  });

  it("returns false for SERVER_SPLIT (lives on the server, not in IndexedDB)", () => {
    expect(isDatasetInIndexedDB({ source: DATASET_SOURCE.SERVER_SPLIT })).toBe(false);
  });
});

describe("isUserUpload", () => {
  it("returns true only for UPLOAD-sourced datasets", () => {
    expect(isUserUpload({ source: DATASET_SOURCE.UPLOAD })).toBe(true);
    expect(isUserUpload({ source: DATASET_SOURCE.SERVER_CONSOLIDATED })).toBe(false);
    expect(isUserUpload({ source: DATASET_SOURCE.SERVER_SPLIT })).toBe(false);
  });

  it("derives correctly from legacy flags (record from before the enum landed)", () => {
    expect(isUserUpload({ temporary: true, isClientSide: true })).toBe(true);
    expect(isUserUpload({ temporary: false, isClientSide: true })).toBe(false);
  });
});
