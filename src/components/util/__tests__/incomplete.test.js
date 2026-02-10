import React from "react";
import { render, screen } from "@testing-library/react";
import { IncompleteDataWarning } from "../incomplete";

describe("IncompleteDataWarning", () => {
  it("renders the data_type in the heading", () => {
    render(<IncompleteDataWarning datum={{ id: "abc" }} data_type="tree" />);
    expect(screen.getByText(/Insufficient data to display tree/)).toBeInTheDocument();
  });

  it("shows the datum id in the heading", () => {
    render(<IncompleteDataWarning datum={{ id: "clone_42" }} data_type="clone" />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("clone_42");
  });

  it("falls back to ident when id is missing", () => {
    render(<IncompleteDataWarning datum={{ ident: "fam_7" }} data_type="family" />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("fam_7");
  });

  it("renders without id when both id and ident are missing", () => {
    render(<IncompleteDataWarning datum={{}} data_type="widget" />);
    const heading = screen.getByText(/Insufficient data to display widget/);
    expect(heading).toBeInTheDocument();
    // No colon + id appended
    expect(heading.textContent).not.toMatch(/: $/);
  });

  it("renders the datum as JSON in a code block", () => {
    const datum = { id: "x", value: 99 };
    render(<IncompleteDataWarning datum={datum} data_type="item" />);
    expect(screen.getByText(/"value": 99/)).toBeInTheDocument();
  });

  it("renders the instruction paragraph", () => {
    render(<IncompleteDataWarning datum={{ id: "z" }} data_type="node" />);
    expect(screen.getByText(/object has been logged to the console for inspection/)).toBeInTheDocument();
  });
});
