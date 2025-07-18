# Package-lock.json Persistence Attempts - Issue #201

**Date:** 2025-07-17  
**Problem:** npm audit fixes not persisting in Docker builds  
**Status:** In Progress - Multiple approaches attempted

---

## Problem Description

Despite successfully applying npm audit fixes locally and updating the Dockerfile to use `npm ci`, Docker containers still show the original vulnerability count:
- **Expected:** ~101-115 vulnerabilities (after fixes)
- **Actual in Docker:** 169 vulnerabilities (7 low, 28 moderate, 79 high, 55 critical)

This indicates that npm audit fixes are not persisting through Docker builds, likely due to floating dependencies when package-lock.json is not properly maintained.

---

## Approaches Attempted

### 1. Dockerfile Modification ✅ COMPLETED
**Action:** Updated Dockerfile to use `npm ci` instead of `npm install`
```dockerfile
# OLD:
COPY package*.json ./
RUN rm -f package-lock.json
RUN npm install --legacy-peer-deps --ignore-scripts

# NEW:
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --ignore-scripts
```

**Result:** Dockerfile updated but vulnerabilities still persist

### 2. Package-lock.json Generation ✅ COMPLETED
**Action:** Generated new package-lock.json locally after npm audit fixes
```bash
# Remove old dependencies
sudo rm -rf node_modules package-lock.json

# Reinstall and fix vulnerabilities
npm install --legacy-peer-deps --package-lock-only
npm audit fix --legacy-peer-deps
```

**Result:** 
- Local vulnerabilities: 101 (29 moderate, 37 high, 35 critical)
- Generated package-lock.json with fixed dependencies
- Dockerfile updated to copy both package.json and package-lock.json

### 3. Docker Build Test ⚠️ ISSUE FOUND
**Action:** Built Docker image with new package-lock.json
```bash
docker build --no-cache -t olmsted:locked .
```

**Result:** Build successful but still shows 169 vulnerabilities in container

---

## Root Cause Analysis

### Possible Issues:
1. **Package-lock.json not being copied correctly** - May not exist in container
2. **Environment mismatch** - Node.js version differences between local and container
3. **npm ci behavior** - May not be reading package-lock.json properly with --legacy-peer-deps
4. **Dependency resolution differences** - Container environment may resolve differently

### Evidence:
- Local npm audit shows 101 vulnerabilities
- Docker container npm audit shows 169 vulnerabilities  
- Same package.json, same Node.js version (18.x)
- package-lock.json should contain fixed dependency versions

---

## Next Steps to Investigate

### 1. Container Inspection
- Verify package-lock.json exists in container
- Check if package-lock.json matches local version
- Examine npm ci output in container

### 2. Alternative Approaches
- Try `npm install --legacy-peer-deps` instead of `npm ci`
- Generate package-lock.json inside container
- Use multi-stage build with separate dependency installation

### 3. Debugging Commands
```bash
# Check if package-lock.json exists in container
docker run --rm olmsted:locked ls -la package-lock.json

# Check vulnerability count in container  
docker run --rm olmsted:locked npm audit

# Compare package-lock.json between local and container
docker run --rm olmsted:locked cat package-lock.json > container-package-lock.json
diff package-lock.json container-package-lock.json
```

---

## Technical Notes

### npm ci vs npm install:
- **npm ci:** Installs dependencies directly from package-lock.json, faster and more reliable
- **npm install:** Resolves dependencies from package.json, may update package-lock.json

### --legacy-peer-deps:
- Required for older packages that don't follow modern peer dependency rules
- May affect how npm ci resolves dependencies

### Docker Layer Caching:
- Using --no-cache ensures fresh build
- COPY order matters for layer invalidation

---

## Files Modified

### Dockerfile:
- Line 28: `COPY package.json package-lock.json ./`
- Line 31: `RUN npm ci --legacy-peer-deps --ignore-scripts`

### Generated:
- `package-lock.json` - New version with fixed dependencies
- `logs/npm-install--local.txt` - Local npm install and audit results

---

## Status Summary

**What Works:**
- ✅ Local npm audit fixes reduce vulnerabilities to 101
- ✅ package-lock.json generated with fixed versions
- ✅ Dockerfile updated to use npm ci
- ✅ Docker build completes successfully

**What Doesn't Work:**
- ❌ Docker container still shows 169 vulnerabilities
- ❌ npm audit fixes not persisting in container environment

**Next Action Required:**
- Investigate why package-lock.json is not being effective in container
- Debug container environment vs local environment differences