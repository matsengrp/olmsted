# CLAUDE.md

This file provides guidance to Claude Code when working with the Olmsted repository.
Some of these preferences may be overridden by the user's `~/.claude/CLAUDE.md`. Please defer to that file when it conflicts with the instructions here.

## Project Overview

Olmsted is a browser-based application for visualizing and exploring B cell lineages. It enables researchers to scan across collections of clonal families using summary statistics, then examine individual families to visualize phylogenies and mutations.

The project consists of two components:
- **Olmsted Web Application** (this repository): React/Redux web app for interactive visualization
- **Olmsted CLI** (separate repository): Python CLI for data processing and format conversion

Public instance: [olmstedviz.org](http://olmstedviz.org)

## Repository Structure

```
olmsted/
├── src/
│   ├── components/           # React components
│   │   ├── explorer/         # Main visualization components
│   │   │   └── vega/         # Vega-based charts and plots
│   │   ├── splash/           # Landing page and file upload
│   │   └── util/             # Component-specific utilities
│   ├── utils/                # Data processing utilities
│   ├── util/                 # Core application utilities
│   ├── store/                # Redux store configuration
│   ├── actions/              # Redux action creators
│   ├── reducers/             # Redux reducers
│   ├── selectors/            # Reselect memoized selectors
│   └── middleware/           # Redux middleware
├── bin/                      # Shell scripts and deployment utilities
├── data/                     # Local data directory (gitignored)
├── docs/                     # Documentation images
├── ARCHITECTURE.md           # System architecture documentation
├── DEVELOPMENT.md            # Developer onboarding guide
└── CLAUDE.md                 # This file
```

## Design Documents

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Data flow, Redux store structure, component hierarchy, Vega integration
- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Setup guide, common tasks, debugging, build process

## Development Environment

### Requirements
- **Node.js**: v18.x LTS
- **npm**: >= 9.0.0

### Setup
```bash
git clone https://github.com/matsengrp/olmsted.git
cd olmsted
npm install --legacy-peer-deps
npm start
```

The `--legacy-peer-deps` flag is required due to peer dependency conflicts with older packages.

### Common Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start development server with hot reloading |
| `npm run build` | Build production bundle |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without modifying |

## Code Quality Standards

### Static Analysis Tools
- **ESLint**: Airbnb style guide with Babel parser for decorators
- **Prettier**: Code formatting

### Code Standards
- **Function size**: No function should exceed 50 lines
- **Error handling**: Comprehensive try-catch blocks with specific error messages
- **Naming**: Consistent camelCase with verb prefixes (get, set, handle, process, validate)
- **Documentation**: JSDoc for all public methods and complex functions
- **Formatting**: 2-space indentation, consistent quote usage

### Clean Code Principles
- **Single Responsibility**: Each function/class does one thing well
- **Meaningful Names**: Variables and functions reveal intent
- **Small Functions**: Keep functions focused and testable
- **DRY**: Don't repeat yourself - extract common patterns
- **Fail Fast**: Validate inputs early, raise clear errors

### Architecture Principles
- **Academic KISS**: Functionality over features, simplicity over complexity
- **Maintainability**: Well-documented, understandable code structure
- **Future-Proofing**: Modern dependencies and patterns for long-term viability

### Pre-PR Quality Checklist

Before any pull request:

1. **Format Code**: Run `npm run format`
2. **Lint Check**: Run `npm run lint` and address errors
3. **Test Locally**: Verify changes work in browser
4. **Documentation**: Update JSDoc for modified functions
5. **Update Project Documentation**: Keep these files current:
   - `CLAUDE.md` - Update if adding new patterns, lessons learned, or terminology
   - `ARCHITECTURE.md` - Update if changing data flow, Redux store, or component hierarchy
   - `DEVELOPMENT.md` - Update if changing setup, scripts, or common workflows
   - `CHANGELOG.md` - Add entry for user-facing changes

## Terminology

### B Cell / Immunology Terms

- **Clonal Family**: A group of B cells descended from a common ancestor through somatic hypermutation
- **Naive Sequence**: The original BCR sequence before somatic hypermutation, reconstructed from V(D)J germline genes
- **Somatic Hypermutation (SHM)**: The process by which B cells mutate their antibody genes
- **V(D)J Recombination**: The process that assembles variable (V), diversity (D), and joining (J) gene segments

### Metrics

- **Mean Mutation Frequency**: Average number of mutations per sequence, weighted by sequence multiplicity
- **LBI (Local Branching Index)**: Measure of recent rapid branching in a phylogenetic tree (Neher et al., 2014)
- **LBR (Local Branching Ratio)**: Ratio comparing a node's LBI to its parent's LBI
- **Multiplicity**: Number of identical sequences observed (before deduplication)

### Data Formats

- **AIRR**: Adaptive Immune Receptor Repertoire - JSON format following AIRR Community standards
- **PCP**: Parent-Child Pair - CSV format with phylogenetic relationships and optional Newick trees
- **Olmsted JSON**: Internal format produced by olmsted-cli, consumed by the web application

### Application Terms

- **Brush Selection**: Interactive selection by clicking/dragging on scatterplot
- **Faceting**: Splitting visualization into panels by a categorical variable
- **Split Format**: Server-side data format with separate files for datasets, clones, and trees

## Deployment Architecture

### GitHub Actions CI/CD Pipeline

When code is pushed to any branch, GitHub Actions:
1. Builds Docker image using the `Dockerfile`
2. Tags the image (master → git version tag, other branches → branch name)
3. Pushes to `quay.io/matsengrp/olmsted:$TAG`
4. Updates `latest` tag when building from master

### Website Deployment (olmstedviz.org)

The public website is **NOT served from Docker**:
- Static S3 hosting with files uploaded via `bin/aws_deploy.py`
- CloudFront CDN with cache invalidation via `bin/aws_invalidate_cloudfront.py`

### Deployment Options

| Method | Use Case |
|--------|----------|
| Docker (Quay.io) | Self-hosted instances |
| Static S3 | Public website (olmstedviz.org) |
| `npm start` | Local development |

### Deployment Scripts

| Script | Purpose |
|--------|---------|
| `bin/olmsted-server.sh` | Run Docker container |
| `bin/olmsted-server-local.sh` | Run locally with volume mounts |
| `bin/aws_deploy.py` | Upload to S3 (supports --dry-run) |
| `bin/aws_invalidate_cloudfront.py` | Invalidate CDN cache |

## Related Repositories

- **olmsted-cli**: https://github.com/matsengrp/olmsted-cli - Data processing CLI
- **AIRR Standards**: https://github.com/airr-community/airr-standards - Input format specification

## Lessons Learned

- Always use `--legacy-peer-deps` with npm install due to peer dependency conflicts
- IndexedDB can be cleared in DevTools > Application > IndexedDB if database gets corrupted
- Large datasets benefit from the lazy loading strategy (tree data loaded on-demand)
- The `@connect` decorator syntax requires `@babel/eslint-parser` in editor ESLint config

---

*Last updated: 2026-01-28*
