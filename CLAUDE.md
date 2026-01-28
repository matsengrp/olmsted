# Olmsted Project Overview

## Project Structure and Locations

### Primary Repositories
- **Olmsted Web Application**: `./olmsted/` - Main React/Redux web application for B cell lineage visualization
- **Olmsted CLI Tool**: `./olmsted-cli/` - Python CLI for data processing and format conversion (AIRR, PCP → Olmsted JSON)

### Key Directories in Olmsted Web App (`./olmsted/`)
```
src/
├── components/           # React components
│   ├── explorer/        # Main visualization components
│   │   └── vega/       # Vega-based charts and plots
│   ├── splash/         # Landing page and file upload
│   └── util/           # Component-specific utilities
├── utils/              # Data processing utilities
├── util/               # Core application utilities
├── store/              # Redux store and models
├── actions/            # Redux actions
└── reducers/           # Redux reducers
```

### Key Directories in Olmsted CLI (`./olmsted-cli/`)
```
olmsted_cli/            # Python package source
tests/                  # Test suite
example_data/           # Sample data files (PCP, AIRR formats)
```

---

## Current Features

### Web Application
- **Client-Side Data Upload**: Drag-and-drop interface with IndexedDB persistence
- **Interactive Visualizations**:
  - Clonal family scatterplot with zoom/pan (shift+scroll/drag)
  - Dynamic lineage graphs with configurable node display
  - Tree view with comprehensive node tooltips (including LBI/LBR metrics)
- **Dataset Management**: Batch operations, lazy loading, color-coded status indicators
- **Modern Stack**: React 18, Vega 5, D3 ecosystem

### CLI Tool
- **Format Support**:
  - **AIRR (Adaptive Immune Receptor Repertoire)**: JSON format following AIRR Community standards
  - **PCP (Parent-Child Pair)**: CSV format with phylogenetic relationships and optional Newick trees
  - Both formats convert to Olmsted JSON
- **Tree Reconstruction**: Newick string-based phylogenetic tree processing
- **Metric Calculations**:
  - Mean mutation frequency (weighted by sequence multiplicity)
  - Local Branching Index (LBI) with configurable tau parameter
  - Local Branching Ratio (LBR)
- **Verbosity System**: Centralized `VerbosePrinter` class with 4 levels (0=quiet, 1=normal, 2=verbose, 3=debug)

---

## Deployment Architecture

### GitHub Actions CI/CD Pipeline

#### Docker Image Build & Registry
When code is pushed to any branch, GitHub Actions automatically:
1. **Builds Docker image** using the `Dockerfile`
2. **Tags the image**:
   - `master` branch → Tagged with git version (e.g., `v2.1.1-11-gec852b7`)
   - Other branches → Tagged with branch name
3. **Pushes to Quay.io**: Images published to `quay.io/matsengrp/olmsted:$TAG`
4. **Updates `latest` tag** when building from master

#### Website Deployment (olmstedviz.org)
The public website is **NOT served from Docker**. Instead:
- **Static S3 hosting**: Website files are uploaded to AWS S3 bucket
- **Manual or GitHub Actions deployment**: Use `bin/aws_deploy.py` or workflow dispatch
- **Content delivery**: S3 bucket configured for static website hosting at olmstedviz.org
- **CloudFront CDN**: Cache invalidation available via `bin/aws_invalidate_cloudfront.py`

### Deployment Scripts Reference

| Script | Location | Purpose |
|--------|----------|---------|
| **olmsted-server.sh** | `bin/` | Runs Olmsted Docker container for self-hosting |
| **olmsted-server-local.sh** | `bin/` | Runs Olmsted locally with volume mounts for development |
| **create-data-dir.sh** | `bin/` | Creates empty `data/` directory (used by postinstall) |
| **postbuild.sh** | `bin/` | Creates static deployment in `deploy/` directory |
| **aws_deploy.py** | `bin/` | Uploads static files to AWS S3 (supports --dry-run) |
| **aws_download.py** | `bin/` | Downloads production files from S3 to local directory |
| **aws_explore.py** | `bin/` | Inspects and lists S3 bucket contents |
| **aws_invalidate_cloudfront.py** | `bin/` | Manually invalidates CloudFront cache |
| **check_invalidation_status.py** | `bin/` | Monitors CloudFront invalidation progress |
| **setup-eslint-plugin.js** | `scripts/` | Sets up custom ESLint rules after npm install |

### Docker vs Static Deployment
- **Docker image (Quay.io)**: For organizations to self-host their own Olmsted instance
- **Static site (olmstedviz.org)**: Public website served from S3, not a running container
- **Local development**: Use `npm start` or `olmsted-server-local.sh`

---

## Development Requirements

### Runtime Environment
- **Node.js**: v18.x LTS (upgraded from v9.6.x in PR #207, July 2025)
- **npm**: >=9.0.0
- **Python**: 3.9+ (for olmsted-cli data processing)

**Note**: The Node.js upgrade from v9.6.x to v18 LTS was completed in version 2.2.1 (PR #207). All development and deployment workflows now use Node 18.x.

---

## Development Guidelines

### Testing Commands
- **Performance testing**: `npm run test:perf`
- **Local performance server**: `npm run test:perf:serve`

### Code Standards
- **Function size**: No function should exceed 50 lines
- **Error handling**: Comprehensive try-catch blocks with specific error messages
- **Naming**: Consistent camelCase with verb prefixes (get, set, handle, process, validate)
- **Documentation**: JSDoc for all public methods and complex functions
- **Formatting**: 2-space indentation, consistent quote usage
- **ESLint**: Current status ~44 warnings (acceptable for development)

### Architecture Principles
- **Academic KISS**: Functionality over features, simplicity over complexity
- **Maintainability**: Well-documented, understandable code structure
- **Future-Proofing**: Modern dependencies and patterns for 5-10 year viability

---

## Known Issues and Limitations

No known issues at this time.

---

## Historical Documentation

Detailed PR history and implementation notes are archived in `_claude_old/CLAUDE_YYYY-MM-DD.md` files.

---

*Last updated: 2025-10-28*
