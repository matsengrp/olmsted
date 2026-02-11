import { isSuperset, union, intersection, difference } from "../sets";

describe("isSuperset", () => {
  it("returns true when set contains all elements of subset", () => {
    expect(isSuperset(new Set([1, 2, 3, 4]), new Set([1, 2]))).toBe(true);
  });

  it("returns true when set equals subset", () => {
    expect(isSuperset(new Set([1, 2]), new Set([1, 2]))).toBe(true);
  });

  it("returns false when set is missing elements from subset", () => {
    expect(isSuperset(new Set([1, 2]), new Set([1, 2, 3]))).toBe(false);
  });

  it("returns true for empty subset", () => {
    expect(isSuperset(new Set([1, 2]), new Set())).toBe(true);
  });

  it("returns true for two empty sets", () => {
    expect(isSuperset(new Set(), new Set())).toBe(true);
  });

  it("works with string elements", () => {
    expect(isSuperset(new Set(["a", "b", "c"]), new Set(["a", "c"]))).toBe(true);
  });
});

describe("union", () => {
  it("combines elements from both sets", () => {
    const result = union(new Set([1, 2]), new Set([3, 4]));
    expect(result).toEqual(new Set([1, 2, 3, 4]));
  });

  it("deduplicates shared elements", () => {
    const result = union(new Set([1, 2, 3]), new Set([2, 3, 4]));
    expect(result).toEqual(new Set([1, 2, 3, 4]));
  });

  it("returns copy of first set when second is empty", () => {
    const result = union(new Set([1, 2]), new Set());
    expect(result).toEqual(new Set([1, 2]));
  });

  it("does not mutate input sets", () => {
    const a = new Set([1]);
    const b = new Set([2]);
    union(a, b);
    expect(a).toEqual(new Set([1]));
    expect(b).toEqual(new Set([2]));
  });
});

describe("intersection", () => {
  it("returns only shared elements", () => {
    const result = intersection(new Set([1, 2, 3]), new Set([2, 3, 4]));
    expect(result).toEqual(new Set([2, 3]));
  });

  it("returns empty set when no overlap", () => {
    const result = intersection(new Set([1, 2]), new Set([3, 4]));
    expect(result).toEqual(new Set());
  });

  it("returns empty set when one set is empty", () => {
    const result = intersection(new Set([1, 2]), new Set());
    expect(result).toEqual(new Set());
  });
});

describe("difference", () => {
  it("returns elements in first set not in second", () => {
    const result = difference(new Set([1, 2, 3]), new Set([2, 3, 4]));
    expect(result).toEqual(new Set([1]));
  });

  it("returns copy of first set when second is empty", () => {
    const result = difference(new Set([1, 2, 3]), new Set());
    expect(result).toEqual(new Set([1, 2, 3]));
  });

  it("returns empty set when first is subset of second", () => {
    const result = difference(new Set([1, 2]), new Set([1, 2, 3]));
    expect(result).toEqual(new Set());
  });

  it("does not mutate input sets", () => {
    const a = new Set([1, 2, 3]);
    const b = new Set([2]);
    difference(a, b);
    expect(a).toEqual(new Set([1, 2, 3]));
  });
});
