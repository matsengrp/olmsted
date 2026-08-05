import { buildVegaTooltipExpr } from "../fieldMetadata";

describe("buildVegaTooltipExpr", () => {
  it("builds a Vega object literal keyed by label", () => {
    const expr = buildVegaTooltipExpr([
      { field: "sequence_id", label: "Sequence ID" },
      { field: "distance", label: "Distance", format: ".3f" }
    ]);
    expect(expr).toBe('{"Sequence ID": datum["sequence_id"], "Distance": format(datum["distance"], ".3f")}');
  });

  it("supports dot-notation nested accessors", () => {
    const expr = buildVegaTooltipExpr([{ field: "sample.locus", label: "Locus" }]);
    expect(expr).toBe('{"Locus": datum["sample"] ? datum["sample"]["locus"] : ""}');
  });

  it("applies a null fallback when requested", () => {
    const expr = buildVegaTooltipExpr([{ field: "parent", label: "Parent ID" }], {
      nullFallback: "N/A"
    });
    expect(expr).toBe('{"Parent ID": datum["parent"] != null ? datum["parent"] : "N/A"}');
  });

  describe("label de-duplication", () => {
    it("drops a later field whose label duplicates an earlier one", () => {
      // The tooltip is a Vega object literal; a repeated key is invalid and
      // fails to parse. First occurrence wins (builtins are ordered first).
      const expr = buildVegaTooltipExpr([
        { field: "type", label: "Node Type" },
        { field: "node_type", label: "Node Type" }
      ]);
      // Only one "Node Type" key, backed by the first (topological) field.
      expect(expr).toBe('{"Node Type": datum["type"]}');
      expect(expr).not.toContain("node_type");
    });

    it("never emits a duplicate object key", () => {
      const expr = buildVegaTooltipExpr([
        { field: "a", label: "Dup" },
        { field: "b", label: "Dup" },
        { field: "c", label: "Unique" }
      ]);
      const keys = [...expr.matchAll(/"([^"]+)":/g)].map((m) => m[1]);
      expect(keys).toEqual([...new Set(keys)]);
      expect(keys).toEqual(["Dup", "Unique"]);
    });

    it("keeps distinct labels untouched", () => {
      const expr = buildVegaTooltipExpr([
        { field: "type", label: "Node Type" },
        { field: "node_type", label: "Observed/Inferred" }
      ]);
      expect(expr).toContain('"Node Type": datum["type"]');
      expect(expr).toContain('"Observed/Inferred": datum["node_type"]');
    });
  });
});
