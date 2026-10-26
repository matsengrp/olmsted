import * as queryString from "../queryString";

describe("queryString", () => {
  it("parses with or without leading ?", () => {
    expect(queryString.parse("?a=1&b=x%20y")).toEqual({ a: "1", b: "x y" });
    expect(queryString.parse("a=1")).toEqual({ a: "1" });
    expect(queryString.parse("")).toEqual({});
  });

  it("turns repeated keys into arrays and bare keys into null", () => {
    expect(queryString.parse("?d=a&d=b&flag")).toEqual({ d: ["a", "b"], flag: null });
  });

  it("decodes plus as space and tolerates malformed escapes", () => {
    expect(queryString.parse("?a=x+y&b=%E0%A4%A")).toEqual({ a: "x y", b: "%E0%A4%A" });
  });

  it("stringifies with sorted keys, repeated array keys, and skipped undefined", () => {
    expect(queryString.stringify({ b: "2", a: ["x", "y"], c: undefined })).toBe("a=x&a=y&b=2");
  });

  it("strictly encodes reserved characters", () => {
    expect(queryString.stringify({ q: "a b!'()*,/" })).toBe("q=a%20b%21%27%28%29%2A%2C%2F");
  });

  it("round-trips", () => {
    const q = { selectedDatasets: ["d1", "d2"], colorBy: "lbi" };
    expect(queryString.parse(queryString.stringify(q))).toEqual(q);
  });
});
