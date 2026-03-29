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

  it("uses clone_id for identification", () => {
    render(<IncompleteDataWarning datum={{ clone_id: "CL-99" }} data_type="clonal family" />);
    const heading = screen.getByRole("heading");
    expect(heading.textContent).toContain("CL-99");
  });

  it("renders without id when no identifier fields exist", () => {
    render(<IncompleteDataWarning datum={{}} data_type="widget" />);
    const heading = screen.getByText(/Insufficient data to display widget/);
    expect(heading).toBeInTheDocument();
    expect(heading.textContent).not.toMatch(/: $/);
  });

  it("renders specific reasons when provided", () => {
    const reasons = ["Missing unique sequence count", "Missing V gene call"];
    render(<IncompleteDataWarning datum={{ id: "x" }} data_type="clone" reasons={reasons} />);
    expect(screen.getByText("Missing unique sequence count")).toBeInTheDocument();
    expect(screen.getByText("Missing V gene call")).toBeInTheDocument();
  });

  it("renders fallback message when no reasons provided", () => {
    render(<IncompleteDataWarning datum={{ id: "z" }} data_type="node" />);
    expect(screen.getByText(/Check the browser console for details/)).toBeInTheDocument();
  });

  it("renders fallback message when reasons array is empty", () => {
    render(<IncompleteDataWarning datum={{ id: "z" }} data_type="node" reasons={[]} />);
    expect(screen.getByText(/Check the browser console for details/)).toBeInTheDocument();
  });
});
