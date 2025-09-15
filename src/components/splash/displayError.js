import React from "react";

export const red = "rgb(222, 60, 38)";

export const displayError = (errorMessage) => (
  <div style={{ color: red }}>
    <div style={{ fontSize: "20px", fontWeight: 400, color: red }}>
      Oops - either that page didn&apos;t exist, or there&apos;s been an error
    </div>
    {errorMessage}
  </div>
);
