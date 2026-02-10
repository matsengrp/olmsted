import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { RowInfoModal, InfoButtonCell } from "../RowInfoModal";

// ── RowInfoModal ──

describe("RowInfoModal", () => {
  const baseDatum = {
    name: "TestClone",
    unique_seqs_count: 42,
    mean_mut_freq: 0.035,
    v_call: "IGHV3-23*01",
    is_paired: true,
    sample: { sample_id: "S1", locus: "IGH" }
  };

  it("returns null when isOpen is false", () => {
    const { container } = render(<RowInfoModal datum={baseDatum} isOpen={false} onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when datum is null", () => {
    const { container } = render(<RowInfoModal datum={null} isOpen onClose={jest.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders modal with default title when title not provided", () => {
    render(<RowInfoModal datum={baseDatum} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Row Details")).toBeInTheDocument();
  });

  it("renders modal with custom title", () => {
    render(<RowInfoModal datum={baseDatum} isOpen onClose={jest.fn()} title="My Clone" />);
    expect(screen.getByText("My Clone")).toBeInTheDocument();
  });

  // ── formatValue indirectly ──

  it("formats numbers as strings", () => {
    render(<RowInfoModal datum={{ count: 7 }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("formats booleans as Yes/No", () => {
    render(<RowInfoModal datum={{ active: true, deleted: false }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Yes")).toBeInTheDocument();
    expect(screen.getByText("No")).toBeInTheDocument();
  });

  it("formats null/undefined as em-dash", () => {
    render(<RowInfoModal datum={{ missing: null }} isOpen onClose={jest.fn()} />);
    // The em-dash character
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("formats arrays as JSON", () => {
    render(<RowInfoModal datum={{ tags: ["a", "b"] }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText(/\["a","b"\]|"a",\s*"b"/)).toBeInTheDocument();
  });

  // ── formatLabel indirectly ──

  it("converts snake_case keys to Title Case labels", () => {
    render(<RowInfoModal datum={{ unique_seqs_count: 5 }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Unique Seqs Count")).toBeInTheDocument();
  });

  it("converts camelCase keys to Title Case labels", () => {
    render(<RowInfoModal datum={{ meanMutFreq: 0.1 }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Mean Mut Freq")).toBeInTheDocument();
  });

  // ── Excluded / omitted fields ──

  it("omits excluded keys (trees, nodes, seqs, sequences)", () => {
    const datum = { name: "X", trees: [1, 2], nodes: { a: 1 }, seqs: [] };
    render(<RowInfoModal datum={datum} isOpen onClose={jest.fn()} />);
    expect(screen.getByText(/Fields not shown/)).toBeInTheDocument();
  });

  it("omits large arrays (>10 items)", () => {
    const bigArray = Array.from({ length: 15 }, (_, i) => i);
    render(<RowInfoModal datum={{ name: "Y", items: bigArray }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText(/items \(15 items\)/)).toBeInTheDocument();
  });

  // ── Flattening sample ──

  it("flattens sample sub-object with sample. prefix", () => {
    render(<RowInfoModal datum={{ sample: { sample_id: "S42" } }} isOpen onClose={jest.fn()} />);
    expect(screen.getByText("Sample.sample Id")).toBeInTheDocument();
    expect(screen.getByText("S42")).toBeInTheDocument();
  });

  // ── Close behaviour ──

  it("calls onClose when close button is clicked", () => {
    const onClose = jest.fn();
    render(<RowInfoModal datum={baseDatum} isOpen onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when overlay is clicked", () => {
    const onClose = jest.fn();
    render(<RowInfoModal datum={baseDatum} isOpen onClose={onClose} />);
    const overlay = screen.getByRole("dialog");
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape key", () => {
    const onClose = jest.fn();
    render(<RowInfoModal datum={baseDatum} isOpen onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ── InfoButtonCell ──

describe("InfoButtonCell", () => {
  it("renders em-dash when datum is null", () => {
    render(<InfoButtonCell datum={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders an info button", () => {
    render(<InfoButtonCell datum={{ id: "test" }} />);
    expect(screen.getByLabelText("View row details")).toBeInTheDocument();
  });

  it("opens modal when button is clicked", () => {
    render(<InfoButtonCell datum={{ name: "MyRow", value: 123 }} />);
    fireEvent.click(screen.getByLabelText("View row details"));
    // Modal should now be visible with role dialog
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    // Title should appear in the heading
    expect(screen.getByRole("heading", { name: "MyRow" })).toBeInTheDocument();
  });

  it("derives title from dataset_id when name is missing", () => {
    render(<InfoButtonCell datum={{ dataset_id: "ds_1" }} />);
    fireEvent.click(screen.getByLabelText("View row details"));
    expect(screen.getByText("Dataset: ds_1")).toBeInTheDocument();
  });

  it("derives title from ident when name and dataset_id are missing", () => {
    render(<InfoButtonCell datum={{ ident: "fam_5" }} />);
    fireEvent.click(screen.getByLabelText("View row details"));
    expect(screen.getByText("Family: fam_5")).toBeInTheDocument();
  });
});
