## version 2.2.9 - 2026/01/08
[PR236](https://github.com/matsengrp/olmsted/pull/236) Changed:
* Configuration management: Save, load, and share visualization settings via Settings menu
* Unified filtering system with multi-select filters for locus, subject, sample, V/J genes, and dataset
* Row starring: Mark important rows in tables for easy tracking across selections
* Row info modals: View complete row metadata via info button
* Sticky navigation header with section tracking and settings access
* Export visualizations: PNG/SVG export for all plots with hide-settings option
* Scatterplot enhancements: Faceting (by variable and direction), adjustable plot height with draggable divider
* Clickable alignment rows in tree view to open ancestral lineage data
* Table refactoring: Consistent features across all tables
* UI polish: Button icons, hover effects, consistent styling, comprehensive help documentation

## version 2.2.8 - 2025/12/13
[PR235](https://github.com/matsengrp/olmsted/pull/235) Changed:
* Paired sequence data support
* Stacked mode visualization with two tree/alignment diagrams sharing topology
* Control and selection synchronization between paired chain views
* CSV export buttons for table data
* Draggable height divider for tree/alignment visualization
* Unified download/copy button styling with icons

## version 2.2.7 - 2025/12/04
[PR227](https://github.com/matsengrp/olmsted/pull/227) Changed:
* Script for video tutorial/trailer on webapp and CLI usage
* Patch fix to "deploy_to_aws" GitHub action

## version 2.2.6 - 2025/10/27
[PR226](https://github.com/matsengrp/olmsted/pull/226) Changed:
* Deployment and UX improvements

## version 2.2.5 - 2025/09/19
[PR225](https://github.com/matsengrp/olmsted/pull/225) Changed:
* Resolved all ESLint errors
* Migrated React Hot Loader to React Fast Refresh
* Integrated Prettier with ESLint for consistent formatting
* Fixes to GitHub actions CI/CD pipeline
* Updated multer to v2.0.2 for security

## version 2.2.4 - 2025/09/11
[PR220](https://github.com/matsengrp/olmsted/pull/220) Changed:
* Client-side data upload with drag-and-drop interface
* Persistent dataset storage using IndexedDB
* Progress indicators and comprehensive error handling
* Batch dataset operations and management
* React v16→18 and Vega v4→5 upgrades
* Memory management and performance optimizations
* Fixed all npm audit vulnerabilities after upgrade

## version 2.2.3 - 2025/07/21
[PR219](https://github.com/matsengrp/olmsted/pull/219) Changed:
* Fixed npm package vulneratibilities, focused on D3/Vega (reduced to 0)

## version 2.2.2 - 2025/07/17
[PR214](https://github.com/matsengrp/olmsted/pull/214) Changed:
* Fixed npm package vulneratibilities, apart from D3/Vega (reduced to 16)
* Updated 50+ packages

## version 2.2.1 - 2025/07/14
[PR207](https://github.com/matsengrp/olmsted/pull/207) Changed:
* Upgraded Node.js v9.6.x to v18 lts
* Upgraded a couple npm packages for compatibility

## version 2.2.0 - 2025/07/13
[PR206](https://github.com/matsengrp/olmsted/pull/206) Changed:
* Migrated data processing pipeline from Python 2.7 to Python 3.9+
* Updated all Python dependencies for Python 3 compatibility

## version 2.1.1 - 2020/03/27
[PR149](https://github.com/matsengrp/olmsted/pull/149) Changed:
* Browser compatibility: Firefox, Safari, Edge, Chrome

## version 2.1.0 - 2020/03/27
[PR148](https://github.com/matsengrp/olmsted/pull/148) Changed:
* Python dependencies to Dockerfile
* Submodule dependencies

## version 2.0.1 - 2020/02/24
[PR147](https://github.com/matsengrp/olmsted/pull/147) Changed:
* Added Dockerfile
* Docker instructions
* Github actions continuous integration
