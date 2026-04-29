import { UNSPECIFIED_LABEL, displayOrUnspecified } from "../displayLabels";

describe("displayLabels", () => {
  describe("UNSPECIFIED_LABEL", () => {
    it("uses angle-bracket placeholder text", () => {
      expect(UNSPECIFIED_LABEL).toBe("<unspecified>");
    });
  });

  describe("displayOrUnspecified", () => {
    it.each([
      [null, UNSPECIFIED_LABEL],
      [undefined, UNSPECIFIED_LABEL],
      ["", UNSPECIFIED_LABEL]
    ])("returns the placeholder for %p", (input, expected) => {
      expect(displayOrUnspecified(input)).toBe(expected);
    });

    it("returns the value when present", () => {
      expect(displayOrUnspecified("subject-1")).toBe("subject-1");
      expect(displayOrUnspecified(0)).toBe(0);
      expect(displayOrUnspecified(false)).toBe(false);
    });
  });
});
