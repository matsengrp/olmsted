import {
  countLoadedClonalFamilies,
  getAvailableClonalFamilies,
  getBrushedClonalFamilies,
  getClonalFamiliesPage,
  getCloneChain,
  getPairedClone,
  getHeavyLightClones,
  getReferenceFieldValue
} from "../clonalFamilies";
import {
  mockDataset,
  mockDataset2,
  mockFamily1,
  mockFamily2,
  mockFamily3,
  mockPairedFamily
} from "../../__test-data__/mockState";

describe("countLoadedClonalFamilies", () => {
  it("returns 0 for empty datasets", () => {
    expect(countLoadedClonalFamilies([])).toBe(0);
  });

  it("counts clones from loaded datasets", () => {
    expect(countLoadedClonalFamilies([mockDataset])).toBe(3);
  });

  it("ignores datasets that are not DONE loading", () => {
    const loading = { ...mockDataset, loading: "LOADING" };
    expect(countLoadedClonalFamilies([loading])).toBe(0);
  });

  it("sums across multiple loaded datasets", () => {
    expect(countLoadedClonalFamilies([mockDataset, mockDataset2])).toBe(5);
  });
});

describe("getReferenceFieldValue", () => {
  it("prefers a top-level value when present", () => {
    const family = { subject_id: "top", sample: { subject_id: "nested" } };
    expect(getReferenceFieldValue(family, "subject_id")).toBe("top");
  });

  it("falls back to family.sample[field] when top-level is absent", () => {
    const family = { sample: { subject_id: "nested" } };
    expect(getReferenceFieldValue(family, "subject_id")).toBe("nested");
  });

  it.each([null, undefined, ""])("treats top-level %p as absent and falls back", (empty) => {
    const family = { subject_id: empty, sample: { subject_id: "nested" } };
    expect(getReferenceFieldValue(family, "subject_id")).toBe("nested");
  });

  it("returns undefined when both locations are absent", () => {
    expect(getReferenceFieldValue({ sample: {} }, "subject_id")).toBeUndefined();
    expect(getReferenceFieldValue({}, "subject_id")).toBeUndefined();
  });

  it("returns undefined for null/undefined family", () => {
    expect(getReferenceFieldValue(null, "subject_id")).toBeUndefined();
    expect(getReferenceFieldValue(undefined, "subject_id")).toBeUndefined();
  });
});

describe("getAvailableClonalFamilies", () => {
  const makeState = (families, datasets, filters = {}) => ({
    clonalFamilies: {
      byDatasetId: { "dataset-1": families },
      locus: "All",
      filters
    },
    datasets: {
      availableDatasets: datasets
    }
  });

  // Reselect memoizes by reference; without a reset, prior tests' inputs
  // can leak into the current call's cache and produce stale results.
  beforeEach(() => {
    if (getAvailableClonalFamilies.resetRecomputations) {
      getAvailableClonalFamilies.resetRecomputations();
    }
  });

  it("returns families from loaded datasets", () => {
    const state = makeState([mockFamily1, mockFamily2], [mockDataset]);
    const result = getAvailableClonalFamilies(state);
    expect(result).toHaveLength(2);
  });

  it("excludes families from unloaded datasets", () => {
    const unloaded = { ...mockDataset, loading: "LOADING" };
    const state = makeState([mockFamily1], [unloaded]);
    const result = getAvailableClonalFamilies(state);
    expect(result).toHaveLength(0);
  });

  it("applies high-level filters", () => {
    const state = makeState([mockFamily1, mockFamily2], [mockDataset], { "sample.locus": ["IGH"] });
    const result = getAvailableClonalFamilies(state);
    // mockFamily1 has IGH, mockFamily2 has IGK
    expect(result).toHaveLength(1);
    expect(result[0].ident).toBe("family-1");
  });

  it("matches families with absent values when <unspecified> is selected", () => {
    const familyWithSubject = { ...mockFamily1, subject_id: "real-subject" };
    const familyMissingSubject = { ...mockFamily2, subject_id: undefined, sample: { locus: "IGH" } };
    const state = makeState([familyWithSubject, familyMissingSubject], [mockDataset], {
      subject_id: ["<unspecified>"]
    });
    const result = getAvailableClonalFamilies(state);
    expect(result).toHaveLength(1);
    expect(result[0].ident).toBe(familyMissingSubject.ident);
  });

  it("combines real values and <unspecified> with OR logic", () => {
    const a = { ...mockFamily1, subject_id: "real-subject" };
    const b = { ...mockFamily2, subject_id: undefined, sample: { locus: "IGH" } };
    const c = { ...mockFamily3, subject_id: "other-subject" };
    const state = makeState([a, b, c], [mockDataset], {
      subject_id: ["real-subject", "<unspecified>"]
    });
    const result = getAvailableClonalFamilies(state);
    const idents = result.map((f) => f.ident).sort();
    expect(idents).toEqual([a.ident, b.ident].sort());
  });
});

describe("getBrushedClonalFamilies", () => {
  const makeState = (families, brushSelection = undefined) => ({
    clonalFamilies: {
      byDatasetId: { "dataset-1": families },
      locus: "All",
      filters: {},
      brushSelection
    },
    datasets: {
      availableDatasets: [mockDataset]
    }
  });

  it("returns all families when no brush selection", () => {
    const state = makeState([mockFamily1, mockFamily2]);
    const result = getBrushedClonalFamilies(state);
    expect(result).toHaveLength(2);
  });

  it("filters by clicked family", () => {
    const state = makeState([mockFamily1, mockFamily2], { clicked: "family-1" });
    const result = getBrushedClonalFamilies(state);
    expect(result).toHaveLength(1);
    expect(result[0].ident).toBe("family-1");
  });
});

describe("getClonalFamiliesPage", () => {
  const makeState = (families) => ({
    clonalFamilies: {
      byDatasetId: { "dataset-1": families },
      locus: "All",
      filters: {},
      brushSelection: undefined,
      pagination: {
        page: 0,
        per_page: 2,
        order_by: "unique_seqs_count",
        desc: true
      }
    },
    datasets: {
      availableDatasets: [mockDataset]
    }
  });

  it("returns sorted page of families", () => {
    const state = makeState([mockFamily1, mockFamily2, mockFamily3]);
    const result = getClonalFamiliesPage(state);
    expect(result).toHaveLength(2);
    // desc by unique_seqs_count: family3(20), family1(10), family2(5)
    expect(result[0].ident).toBe("family-3");
    expect(result[1].ident).toBe("family-1");
  });
});

describe("getCloneChain", () => {
  it("returns heavy for IGH locus", () => {
    expect(getCloneChain(mockFamily1)).toBe("heavy");
  });

  it("returns light for IGK locus", () => {
    expect(getCloneChain(mockFamily2)).toBe("light");
  });

  it("returns light for IGL locus", () => {
    expect(getCloneChain(mockPairedFamily)).toBe("light");
  });

  it("returns heavy when clone is null", () => {
    expect(getCloneChain(null)).toBe("heavy");
  });

  it("returns heavy when sample is missing", () => {
    expect(getCloneChain({ ident: "no-sample" })).toBe("heavy");
  });
});

describe("getPairedClone", () => {
  const allFamilies = [mockFamily1, mockFamily2, mockFamily3, mockPairedFamily];

  it("finds the paired clone by pair_id", () => {
    const paired = getPairedClone(allFamilies, mockFamily3);
    expect(paired).not.toBeNull();
    expect(paired.ident).toBe("family-4");
  });

  it("returns null for unpaired clones", () => {
    expect(getPairedClone(allFamilies, mockFamily1)).toBeNull();
  });

  it("returns null for null clone", () => {
    expect(getPairedClone(allFamilies, null)).toBeNull();
  });

  it("returns null when clone has no pair_id", () => {
    const noPairId = { ...mockFamily3, pair_id: undefined };
    expect(getPairedClone(allFamilies, noPairId)).toBeNull();
  });
});

describe("getHeavyLightClones", () => {
  it("assigns heavy and light based on selected family chain", () => {
    const result = getHeavyLightClones(mockFamily3, mockPairedFamily);
    expect(result.heavyClone.ident).toBe("family-3"); // IGH
    expect(result.lightClone.ident).toBe("family-4"); // IGL
  });

  it("swaps when selected is light chain", () => {
    const result = getHeavyLightClones(mockPairedFamily, mockFamily3);
    expect(result.heavyClone.ident).toBe("family-3");
    expect(result.lightClone.ident).toBe("family-4");
  });

  it("returns nulls when selectedFamily is null", () => {
    const result = getHeavyLightClones(null, null);
    expect(result.heavyClone).toBeNull();
    expect(result.lightClone).toBeNull();
  });
});
