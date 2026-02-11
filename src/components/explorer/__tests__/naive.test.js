import { getNaiveVizData } from "../naive";

// ── getNaiveVizData ──

describe("getNaiveVizData", () => {
  const heavyClone = {
    germline_alignment: "A".repeat(300),
    v_alignment_start: 0,
    v_alignment_end: 100,
    d_alignment_start: 120,
    d_alignment_end: 150,
    j_alignment_start: 160,
    j_alignment_end: 200,
    junction_start: 95,
    junction_length: 60,
    cdr1_alignment_start: 20,
    cdr1_alignment_end: 40,
    cdr2_alignment_start: 55,
    cdr2_alignment_end: 75,
    v_call: "IGHV3-23*01",
    d_call: "IGHD2-2*01",
    j_call: "IGHJ4*02",
    sample: { locus: "IGH" }
  };

  const lightClone = {
    germline_alignment: "A".repeat(250),
    v_alignment_start: 0,
    v_alignment_end: 90,
    j_alignment_start: 100,
    j_alignment_end: 150,
    junction_start: 85,
    junction_length: 30,
    cdr1_alignment_start: 15,
    cdr1_alignment_end: 35,
    cdr2_alignment_start: 50,
    cdr2_alignment_end: 65,
    v_call: "IGKV1-39*01",
    j_call: "IGKJ2*01",
    sample: { locus: "IGK" }
  };

  it("returns an object with source array", () => {
    const result = getNaiveVizData(heavyClone);
    expect(result).toHaveProperty("source");
    expect(Array.isArray(result.source)).toBe(true);
  });

  it("uses default label '5p'", () => {
    const { source } = getNaiveVizData(heavyClone);
    source.forEach((r) => expect(r.family).toBe("5p"));
  });

  it("uses custom label when provided", () => {
    const { source } = getNaiveVizData(heavyClone, "Heavy");
    source.forEach((r) => expect(r.family).toBe("Heavy"));
  });

  // ── Heavy chain regions ──

  describe("heavy chain clone", () => {
    let source;
    beforeAll(() => {
      source = getNaiveVizData(heavyClone).source;
    });

    it("includes CDR1, CDR2, CDR3 regions", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("CDR1");
      expect(regionNames).toContain("CDR2");
      expect(regionNames).toContain("CDR3");
    });

    it("includes V gene, D gene, J gene", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("V gene");
      expect(regionNames).toContain("D gene");
      expect(regionNames).toContain("J gene");
    });

    it("includes 5' and 3' insertions for heavy chain", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("5' Insertion");
      expect(regionNames).toContain("3' Insertion");
    });

    it("does NOT include V-J Insertion for heavy chain", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).not.toContain("V-J Insertion");
    });

    it("includes Sequence background bar", () => {
      const seq = source.find((r) => r.region === "Sequence");
      expect(seq).toBeDefined();
      expect(seq.start).toBe(0);
      expect(seq.end).toBeGreaterThan(0);
    });

    it("attaches gene call to V gene region", () => {
      const vGene = source.find((r) => r.region === "V gene");
      expect(vGene.gene).toBe("IGHV3-23*01");
    });
  });

  // ── Light chain regions ──

  describe("light chain clone", () => {
    let source;
    beforeAll(() => {
      source = getNaiveVizData(lightClone).source;
    });

    it("includes V-J Insertion instead of D gene for light chain", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("V-J Insertion");
      expect(regionNames).not.toContain("D gene");
      expect(regionNames).not.toContain("5' Insertion");
      expect(regionNames).not.toContain("3' Insertion");
    });

    it("includes V gene and J gene", () => {
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("V gene");
      expect(regionNames).toContain("J gene");
    });
  });

  // ── Edge cases ──

  describe("edge cases", () => {
    it("returns empty source for null clone", () => {
      const { source } = getNaiveVizData(null);
      expect(source).toEqual([]);
    });

    it("returns empty source for undefined clone", () => {
      const { source } = getNaiveVizData(undefined);
      expect(source).toEqual([]);
    });

    it("filters out regions with invalid start/end", () => {
      const sparseClone = {
        germline_alignment: "ACGT",
        v_alignment_start: 0,
        v_alignment_end: 4,
        j_alignment_start: null,
        j_alignment_end: null,
        sample: { locus: "IGH" }
      };
      const { source } = getNaiveVizData(sparseClone);
      // Should still have Sequence and V gene at minimum
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("Sequence");
      expect(regionNames).toContain("V gene");
      // J gene should be filtered out (null start/end)
      expect(regionNames).not.toContain("J gene");
    });

    it("defaults to heavy chain when sample.locus is missing", () => {
      const noLocus = { ...heavyClone, sample: {} };
      const { source } = getNaiveVizData(noLocus);
      // Should include D gene regions (heavy chain behavior)
      const regionNames = source.map((r) => r.region);
      expect(regionNames).toContain("D gene");
    });
  });
});
