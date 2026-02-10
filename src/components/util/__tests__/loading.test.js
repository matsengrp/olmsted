import React from "react";
import { render, screen, act } from "@testing-library/react";
import {
  GreenCheckmark,
  RedXIcon,
  PlusIcon,
  LoadingStatus,
  SimpleInProgress
} from "../loading";

describe("loading.js", () => {
  // ── SVG icon components ──

  describe("GreenCheckmark", () => {
    it("renders a green circle with a check icon", () => {
      const { container } = render(<GreenCheckmark />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ backgroundColor: "#28a745" });
    });

    it("merges custom style prop", () => {
      const { container } = render(<GreenCheckmark style={{ margin: "5px" }} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ margin: "5px", backgroundColor: "#28a745" });
    });
  });

  describe("RedXIcon", () => {
    it("renders a red circle", () => {
      const { container } = render(<RedXIcon />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ backgroundColor: "#dc3545" });
    });

    it("merges custom style prop", () => {
      const { container } = render(<RedXIcon style={{ padding: "2px" }} />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ padding: "2px", backgroundColor: "#dc3545" });
    });
  });

  describe("PlusIcon", () => {
    it("renders a grey circle", () => {
      const { container } = render(<PlusIcon />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveStyle({ backgroundColor: "#6c757d" });
    });

    it("sets cursor to pointer", () => {
      const { container } = render(<PlusIcon />);
      expect(container.firstChild).toHaveStyle({ cursor: "pointer" });
    });
  });

  // ── SimpleInProgress ──

  describe("SimpleInProgress", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("renders a spinner icon by default", () => {
      const { container } = render(<SimpleInProgress />);
      expect(container.querySelector("div")).toBeTruthy();
    });

    it("renders text fallback when small prop is set", () => {
      const { container } = render(<SimpleInProgress small />);
      expect(container.textContent).toMatch(/^Loading\.+$/);
    });

    it("animates the text dots over time", () => {
      const { container } = render(<SimpleInProgress small />);
      const getText = () => container.textContent;

      // Initial render
      expect(getText()).toBe("Loading.");

      // Advance timer intervals (counter increments each 400ms)
      act(() => jest.advanceTimersByTime(400)); // counter=1 → ".."
      expect(getText()).toBe("Loading..");

      act(() => jest.advanceTimersByTime(400)); // counter=2 → "..."
      expect(getText()).toBe("Loading...");

      act(() => jest.advanceTimersByTime(400)); // counter=3 → "..." (capped at 3)
      expect(getText()).toBe("Loading...");

      // Wraps back at counter=4
      act(() => jest.advanceTimersByTime(400)); // counter=4 → "."
      expect(getText()).toBe("Loading.");
    });

    it("clears the interval on unmount", () => {
      const clearSpy = jest.spyOn(global, "clearInterval");
      const { unmount } = render(<SimpleInProgress />);
      unmount();
      expect(clearSpy).toHaveBeenCalled();
      clearSpy.mockRestore();
    });
  });

  // ── LoadingStatus ──

  describe("LoadingStatus", () => {
    it("shows spinner for LOADING status", () => {
      const { container } = render(<LoadingStatus loadingStatus="LOADING" />);
      // Default loading renders SimpleInProgress which has an animated icon
      expect(container.firstChild).toBeTruthy();
    });

    it("shows green checkmark for DONE status", () => {
      const { container } = render(<LoadingStatus loadingStatus="DONE" />);
      expect(container.firstChild).toHaveStyle({ backgroundColor: "#28a745" });
    });

    it("shows red X for ERROR status", () => {
      const { container } = render(<LoadingStatus loadingStatus="ERROR" />);
      expect(container.firstChild).toHaveStyle({ backgroundColor: "#dc3545" });
    });

    it("shows plus icon for unknown status", () => {
      const { container } = render(<LoadingStatus loadingStatus="OTHER" />);
      expect(container.firstChild).toHaveStyle({ backgroundColor: "#6c757d" });
    });

    it("uses custom loading component when provided", () => {
      render(<LoadingStatus loadingStatus="LOADING" loading={<span data-testid="custom">busy</span>} />);
      expect(screen.getByTestId("custom")).toBeInTheDocument();
    });

    it("uses custom done component when provided", () => {
      render(<LoadingStatus loadingStatus="DONE" done={<span data-testid="done">ok</span>} />);
      expect(screen.getByTestId("done")).toBeInTheDocument();
    });

    it("uses custom error component when provided", () => {
      render(<LoadingStatus loadingStatus="ERROR" error={<span data-testid="err">fail</span>} />);
      expect(screen.getByTestId("err")).toBeInTheDocument();
    });
  });
});
