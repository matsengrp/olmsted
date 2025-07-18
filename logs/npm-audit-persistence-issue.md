# NPM Audit Fix Persistence Issue - Investigation Notes
## Issue #201 - Package Vulnerability Fixes

**Date:** 2025-07-17  
**Issue:** npm audit fix results don't persist through Docker rebuilds

---

## Problem Description

When running `npm audit fix` in the Docker container, vulnerabilities are reduced from 169 → 132, but after rebuilding Docker with the updated package.json, it shows 169 vulnerabilities again until `npm audit fix` is run again.

---

## Root Cause Analysis

### 1. **No package-lock.json**
The Dockerfile explicitly removes package-lock.json:
```dockerfile
RUN rm -f package-lock.json
```

**Impact:**
- npm resolves transitive dependencies differently each build
- Minor version differences in sub-dependencies
- Security patches in transitive dependencies aren't locked

### 2. **npm audit fix updates transitive dependencies**
When `npm audit fix` runs, it updates:
- **Direct dependencies** (visible in package.json) ✅ We captured these
- **Transitive dependencies** (NOT in package.json) ❌ We can't capture these

Example: When we update `css-loader`, it might update its dependencies like `postcss`, `loader-utils`, etc. Without package-lock.json, these sub-dependency versions float.

### 3. **Dependency resolution differences**
Between our test environment and Docker:
- Different npm versions might resolve differently
- `--legacy-peer-deps` flag affects resolution
- Removal of react-vega-lite changed the dependency tree

---

## Evidence

### Package.json updates captured:
```json
"react-vega": "^3.1.2" → "^4.0.2"
"builder-util": "^10.1.2" → "^10.3.7"  
"css-loader": "^3.0.0" → "^3.6.0"
"vega-lite": "^2.6.0" → "^2.7.0"
```

### What we missed:
- Transitive dependency updates (hundreds of sub-packages)
- Peer dependency resolutions
- Optional dependency selections

---

## Solutions

### Option 1: Generate and commit package-lock.json
**Pros:**
- Ensures reproducible builds
- Captures ALL dependency versions
- Standard npm practice

**Cons:**
- Large file to maintain
- Needs regular updates
- Current Dockerfile removes it

### Option 2: Run npm audit fix in Dockerfile
**Pros:**
- Always gets latest security fixes
- No maintenance needed

**Cons:**
- Non-deterministic builds
- Different versions each build
- Can introduce breaking changes

### Option 3: Capture all direct dependencies
Run `npm ls --depth=0` after audit fix and manually update ALL direct dependencies in package.json.

**Pros:**
- More deterministic than nothing
- Doesn't require package-lock.json

**Cons:**
- Still doesn't capture transitive deps
- Manual process
- Incomplete solution

---

## Current Workaround

We've captured the main dependency updates in package.json, which gives us:
- 169 → 132 vulnerabilities (22% reduction)
- Main security fixes applied
- Functional application

For full persistence, we would need to either:
1. Modify Dockerfile to keep package-lock.json
2. Accept that some vulnerability fixes are temporary
3. Continue with Phase 2 breaking changes for deeper fixes

---

## Recommendation

For this project, continuing with Phase 2 breaking changes will provide more security benefit than trying to capture all transitive dependency updates. The major version updates (webpack-dev-server, mocha, electron-builder) will pull in their own updated dependency trees with security fixes.