import {
  columnDefaultVisible,
  isColumnVisible,
  effectiveOptionalOrder,
  orderedMappings,
  buildColumnDefs,
  filterVisibleMappings
} from "../columnLayout";

const REQUIRED = [["Star", "star", { required: true }]];
const OPTIONAL = [
  ["V gene", "v_call"],
  ["D gene", "d_call"],
  ["Extra", "extra_field", { extra: true }]
];

describe("columnDefaultVisible", () => {
  it("is visible by default unless marked extra", () => {
    expect(columnDefaultVisible({})).toBe(true);
    expect(columnDefaultVisible({ extra: true })).toBe(false);
  });
});

describe("isColumnVisible", () => {
  it("falls back to the column default when no override exists", () => {
    expect(isColumnVisible("V gene", {}, {})).toBe(true);
    expect(isColumnVisible("Extra", { extra: true }, {})).toBe(false);
  });

  it("an explicit override always wins", () => {
    expect(isColumnVisible("V gene", {}, { "V gene": false })).toBe(false);
    expect(isColumnVisible("Extra", { extra: true }, { Extra: true })).toBe(true);
  });
});

describe("effectiveOptionalOrder", () => {
  it("uses the saved order for columns that still exist", () => {
    expect(effectiveOptionalOrder(["D gene", "V gene"], OPTIONAL)).toEqual(["D gene", "V gene", "Extra"]);
  });

  it("drops saved names for columns that no longer exist and appends new ones", () => {
    expect(effectiveOptionalOrder(["Stale", "V gene"], OPTIONAL)).toEqual(["V gene", "D gene", "Extra"]);
  });

  it("defaults to mapping order when nothing is saved", () => {
    expect(effectiveOptionalOrder([], OPTIONAL)).toEqual(["V gene", "D gene", "Extra"]);
    expect(effectiveOptionalOrder(undefined, OPTIONAL)).toEqual(["V gene", "D gene", "Extra"]);
  });
});

describe("orderedMappings", () => {
  it("puts required columns first, then optional columns in saved order", () => {
    const result = orderedMappings(REQUIRED, OPTIONAL, ["D gene"]);
    expect(result.map(([name]) => name)).toEqual(["Star", "D gene", "V gene", "Extra"]);
  });
});

describe("buildColumnDefs / filterVisibleMappings", () => {
  const ordered = orderedMappings(REQUIRED, OPTIONAL, []);

  it("required columns are always visible regardless of overrides", () => {
    const defs = buildColumnDefs(ordered, { Star: false });
    expect(defs.find((d) => d.name === "Star")).toEqual({ name: "Star", required: true, visible: true });
  });

  it("optional visibility reflects defaults and overrides", () => {
    const defs = buildColumnDefs(ordered, { "V gene": false });
    expect(defs.find((d) => d.name === "V gene").visible).toBe(false);
    expect(defs.find((d) => d.name === "D gene").visible).toBe(true);
    expect(defs.find((d) => d.name === "Extra").visible).toBe(false);
  });

  it("filterVisibleMappings excludes hidden optional columns", () => {
    const visible = filterVisibleMappings(ordered, { "V gene": false });
    expect(visible.map(([name]) => name)).toEqual(["Star", "D gene"]);
  });
});
