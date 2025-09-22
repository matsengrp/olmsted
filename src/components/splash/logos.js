/* eslint-disable global-require */
import React from "react";

export const logos = [
  <a key={1} href="http://www.fredhutch.org/" target="_blank" rel="noreferrer noopener">
    <img alt="logo" width="75" src={require("../../images/fred-hutch-logo-small.png")} />
  </a>,
  <a key={2} href="https://github.com/matsengrp/olmsted/" target="_blank" rel="noreferrer noopener">
    <img alt="logo" width="100" src={require("../../images/github-logo-small.png")} />
  </a>,
  <a key={3} href="https://www.nih.gov/" target="_blank" rel="noreferrer noopener">
    <img alt="logo" width="58" src={require("../../images/nih-logo-small.png")} />
  </a>
];
