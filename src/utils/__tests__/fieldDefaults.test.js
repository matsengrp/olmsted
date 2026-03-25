import {
  REQUIRED,
  NODE_FIELD_DEFAULTS,
  CLONE_FIELD_DEFAULTS,
  detectFieldPresence,
  applyNodeDefaults,
  applyCloneDefaults,
  extractGermlineFromTree,
  getMissingFieldSummary
} from "../fieldDefaults";

describe("fieldDefaults", () => {
  describe("detectFieldPresence", () => {
    it("marks all fields present when data has them", () => {
      const clones = [
        {
          clone_id: "c1",
          d_call: "IGHD1",
          j_call: "IGHJ4",
          junction_start: 10,
          junction_length: 20,
          cdr1_alignment_start: 5,
          cdr1_alignment_end: 15,
          cdr2_alignment_start: 20,
          cdr2_alignment_end: 30,
          germline_alignment: "ATCG"
        }
      ];
      const trees = [
        {
          clone_id: "c1",
          nodes: [
            {
              sequence_id: "n1",
              distance: 0.5,
              length: 0.3,
              multiplicity: 2,
              cluster_multiplicity: 5,
              lbi: 0.1,
              lbr: 0.2,
              affinity: 0.3,
              timepoint_multiplicities: [{ timepoint_id: "t1", multiplicity: 2 }],
              surprise_mutations: []
            }
          ]
        }
      ];

      const result = detectFieldPresence(clones, trees);

      // All node fields should be present
      expect(result.node.distance.present).toBe(true);
      expect(result.node.distance.defaulted).toBe(false);
      expect(result.node.lbi.present).toBe(true);
      expect(result.node.surprise_mutations.present).toBe(true);

      // All clone fields should be present
      expect(result.clone.d_call.present).toBe(true);
      expect(result.clone.germline_alignment.present).toBe(true);
    });

    it("marks fields missing in surprise-only format", () => {
      const clones = [
        {
          clone_id: "c1",
          v_call: "IGHV1",
          mean_mut_freq: 0.05
        }
      ];
      const trees = [
        {
          clone_id: "c1",
          nodes: [
            {
              sequence_id: "n1",
              sequence_alignment: "ATCG",
              type: "root",
              parent: null,
              surprise_mutations: [{ site: 1, surprise_mutsel: 3.5 }]
            }
          ]
        }
      ];

      const result = detectFieldPresence(clones, trees);

      // Node metrics should be missing and defaulted
      expect(result.node.lbi.present).toBe(false);
      expect(result.node.lbi.defaulted).toBe(true);
      expect(result.node.distance.present).toBe(false);
      expect(result.node.distance.defaulted).toBe(true);
      expect(result.node.multiplicity.present).toBe(false);
      expect(result.node.multiplicity.defaulted).toBe(true);

      // Surprise mutations should be present
      expect(result.node.surprise_mutations.present).toBe(true);
      expect(result.node.surprise_mutations.defaulted).toBe(false);

      // Clone gene calls should be missing
      expect(result.clone.d_call.present).toBe(false);
      expect(result.clone.d_call.defaulted).toBe(true);
      expect(result.clone.germline_alignment.present).toBe(false);
      expect(result.clone.germline_alignment.defaulted).toBe(true);
    });

    it("handles empty inputs gracefully", () => {
      const result = detectFieldPresence([], []);

      // All fields should be missing
      expect(result.node.lbi.present).toBe(false);
      expect(result.clone.d_call.present).toBe(false);
    });

    it("handles null inputs gracefully", () => {
      const result = detectFieldPresence(null, null);

      expect(result.node.lbi.present).toBe(false);
      expect(result.clone.d_call.present).toBe(false);
    });

    it("handles trees with object-format nodes", () => {
      const trees = [
        {
          clone_id: "c1",
          nodes: {
            n1: { distance: 1.0, lbi: 0.5, multiplicity: 3 }
          }
        }
      ];

      const result = detectFieldPresence([], trees);

      expect(result.node.distance.present).toBe(true);
      expect(result.node.lbi.present).toBe(true);
    });
  });

  describe("applyNodeDefaults", () => {
    it("fills missing fields with default values", () => {
      const node = { sequence_id: "n1", type: "leaf" };

      applyNodeDefaults(node);

      expect(node.distance).toBeNull();
      expect(node.length).toBeNull();
      expect(node.multiplicity).toBe(1);
      expect(node.cluster_multiplicity).toBe(1);
      expect(node.lbi).toBeNull();
      expect(node.lbr).toBeNull();
      expect(node.affinity).toBeNull();
      expect(node.timepoint_multiplicities).toEqual([]);
    });

    it("does not overwrite existing values", () => {
      const node = {
        sequence_id: "n1",
        distance: 0.5,
        lbi: 0.3,
        multiplicity: 5
      };

      applyNodeDefaults(node);

      expect(node.distance).toBe(0.5);
      expect(node.lbi).toBe(0.3);
      expect(node.multiplicity).toBe(5);
      // Missing fields should be filled
      expect(node.length).toBeNull();
      expect(node.lbr).toBeNull();
    });

    it("preserves fields not in the defaults map", () => {
      const node = {
        sequence_id: "n1",
        surprise_mutations: [{ site: 1 }],
        custom_field: "preserved"
      };

      applyNodeDefaults(node);

      expect(node.surprise_mutations).toEqual([{ site: 1 }]);
      expect(node.custom_field).toBe("preserved");
    });
  });

  describe("applyCloneDefaults", () => {
    it("fills missing clone fields with defaults", () => {
      const clone = { clone_id: "c1", v_call: "IGHV1" };

      applyCloneDefaults(clone);

      expect(clone.d_call).toBeNull();
      expect(clone.j_call).toBeNull();
      expect(clone.junction_start).toBeNull();
      expect(clone.junction_length).toBeNull();
      expect(clone.cdr1_alignment_start).toBeNull();
      expect(clone.germline_alignment).toBeNull();
      // Existing fields preserved
      expect(clone.v_call).toBe("IGHV1");
    });

    it("does not overwrite existing values", () => {
      const clone = {
        clone_id: "c1",
        d_call: "IGHD2",
        germline_alignment: "ATCGATCG"
      };

      applyCloneDefaults(clone);

      expect(clone.d_call).toBe("IGHD2");
      expect(clone.germline_alignment).toBe("ATCGATCG");
    });
  });

  describe("REQUIRED sentinel", () => {
    it("is a unique symbol", () => {
      expect(typeof REQUIRED).toBe("symbol");
      expect(REQUIRED.toString()).toContain("REQUIRED");
    });

    it("causes ValidationError when field is missing", () => {
      // Temporarily add a REQUIRED field to test
      const originalDefaults = { ...NODE_FIELD_DEFAULTS };
      NODE_FIELD_DEFAULTS.test_required_field = REQUIRED;

      const node = { sequence_id: "n1" };

      expect(() => applyNodeDefaults(node)).toThrow("Required node field");

      // Clean up
      delete NODE_FIELD_DEFAULTS.test_required_field;
      Object.assign(NODE_FIELD_DEFAULTS, originalDefaults);
    });
  });

  describe("extractGermlineFromTree", () => {
    it("extracts germline from root node", () => {
      const clone = { clone_id: "c1", germline_alignment: null };
      const trees = [
        {
          clone_id: "c1",
          nodes: {
            root: {
              sequence_id: "root",
              type: "root",
              sequence_alignment: "ATCGATCG"
            },
            leaf1: {
              sequence_id: "leaf1",
              type: "leaf",
              sequence_alignment: "ATCGATCG"
            }
          }
        }
      ];

      extractGermlineFromTree(clone, trees);

      expect(clone.germline_alignment).toBe("ATCGATCG");
    });

    it("does not overwrite existing germline_alignment", () => {
      const clone = { clone_id: "c1", germline_alignment: "EXISTING" };
      const trees = [
        {
          clone_id: "c1",
          nodes: [{ type: "root", sequence_alignment: "DIFFERENT" }]
        }
      ];

      extractGermlineFromTree(clone, trees);

      expect(clone.germline_alignment).toBe("EXISTING");
    });

    it("handles missing tree gracefully", () => {
      const clone = { clone_id: "c1", germline_alignment: null };

      extractGermlineFromTree(clone, []);

      expect(clone.germline_alignment).toBeNull();
    });

    it("skips root nodes with empty sequences", () => {
      const clone = { clone_id: "c1", germline_alignment: null };
      const trees = [
        {
          clone_id: "c1",
          nodes: {
            naive: { type: "root", sequence_alignment: "" },
            real_root: { type: "root", sequence_alignment: "ATCG" }
          }
        }
      ];

      extractGermlineFromTree(clone, trees);

      expect(clone.germline_alignment).toBe("ATCG");
    });
  });

  describe("getMissingFieldSummary", () => {
    it("returns empty array when all fields present", () => {
      const dataFields = {
        node: {
          distance: { present: true, defaulted: false },
          lbi: { present: true, defaulted: false },
          lbr: { present: true, defaulted: false },
          affinity: { present: true, defaulted: false },
          multiplicity: { present: true, defaulted: false },
          cluster_multiplicity: { present: true, defaulted: false }
        },
        clone: {
          d_call: { present: true, defaulted: false },
          j_call: { present: true, defaulted: false },
          germline_alignment: { present: true, defaulted: false },
          cdr1_alignment_start: { present: true, defaulted: false },
          cdr2_alignment_start: { present: true, defaulted: false },
          junction_start: { present: true, defaulted: false }
        }
      };

      expect(getMissingFieldSummary(dataFields)).toEqual([]);
    });

    it("lists missing categories for surprise-format data", () => {
      const dataFields = {
        node: {
          distance: { present: false, defaulted: true },
          lbi: { present: false, defaulted: true },
          lbr: { present: false, defaulted: true },
          affinity: { present: false, defaulted: true },
          multiplicity: { present: false, defaulted: true },
          cluster_multiplicity: { present: false, defaulted: true }
        },
        clone: {
          d_call: { present: false, defaulted: true },
          j_call: { present: false, defaulted: true },
          germline_alignment: { present: false, defaulted: true },
          cdr1_alignment_start: { present: false, defaulted: true },
          cdr2_alignment_start: { present: false, defaulted: true },
          junction_start: { present: false, defaulted: true }
        }
      };

      const summary = getMissingFieldSummary(dataFields);

      expect(summary.length).toBeGreaterThan(0);
      expect(summary.some((s) => s.includes("lbi"))).toBe(true);
      expect(summary.some((s) => s.includes("multiplicity"))).toBe(true);
      expect(summary.some((s) => s.includes("CDR"))).toBe(true);
    });

    it("returns empty array for null input", () => {
      expect(getMissingFieldSummary(null)).toEqual([]);
    });
  });
});
