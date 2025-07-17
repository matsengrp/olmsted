# Breaking Updates Progress - Issue #201

**Date:** 2025-07-17  
**Status:** Testing breaking package updates systematically  
**Goal:** Fix additional vulnerabilities with controlled breaking changes

---

## Current State of package.json

### ✅ Successfully Applied:
1. **papaparse**: `^4.6.3` → `^5.5.3` ✅
   - Fixed ReDoS vulnerability
   - No breaking changes observed
   - Vulnerabilities: 105 (reduced from baseline)

2. **d3-color**: `^1.4.1` → `^3.1.0` ✅
   - Fixed ReDoS vulnerability
   - Visualizations still working correctly
   - Vulnerabilities: 105 (same as papaparse)

### ❌ Failed:
3. **css-loader**: `^3.6.0` → `^7.1.2` ❌
   - Error: `this.getOptions is not a function`
   - Cause: css-loader 7.x requires webpack 5.x
   - Reverted back to `^3.6.0`

### ✅ Successfully Applied (continued):
4. **compression-webpack-plugin**: `^1.1.12` → `^11.1.0` ✅
   - Fixed serialize-javascript RCE vulnerability
   - Build and frontend working correctly
   - Vulnerabilities: 100 (reduced from 105)

---

## Next Steps (In Order):

### ✅ Successfully Applied (continued):
5. **node-fetch**: `^1.7.3` → `^3.3.2` ✅
   - Fixed SSRF vulnerability
   - Breaking: CommonJS → ESM migration handled gracefully
   - Vulnerabilities: 99 (reduced from 100)

### ✅ Successfully Applied (continued):
6. **webpack**: `^4.47.0` → `^5.100.2` ✅
   - Fixed braces ReDoS vulnerability
   - Major breaking change handled successfully
   - Vulnerabilities: 94 (reduced from 99)
   - Warnings: vega-lib named export warning, DefinePlugin NODE_ENV conflict

### 🔄 In Progress:
7. **Babel 6 → 7/8**
   - Fixes babel-traverse critical vulnerability
   - Most complex migration

---

## Important Notes:

### Dockerfile Status:
- Currently using `npm install` instead of `npm ci` for testing
- Line 31: `RUN npm install --legacy-peer-deps --ignore-scripts`
- Need to revert to `npm ci` after testing complete

### Docker Build Command:
```bash
cd /home/devreckas/Google-Drive/Work/matsen-lab/olmsted/olmsted
docker build -t olmsted:<test-name> .
```

### Testing Checklist:
- [ ] Build completes successfully
- [ ] Server starts without errors
- [ ] Frontend loads correctly
- [ ] Interactive visualizations work
- [ ] Check npm audit for vulnerability count

---

## Summary So Far:

**Baseline vulnerabilities:** 119 (from previous npm audit)  
**After papaparse + d3-color:** 105 vulnerabilities  
**After compression-webpack-plugin:** 100 vulnerabilities
**After node-fetch:** 99 vulnerabilities
**After webpack 5:** 94 vulnerabilities
**Total Reduction:** 25 vulnerabilities fixed (21% reduction)

**Production impact:** Significant improvement
- Before: 31 moderate, 39 high, 35 critical
- After npm audit fix: 30 moderate, 35 high, 35 critical

---

## Resume Instructions:

1. Check if compression-webpack-plugin test completed
2. If successful, continue with node-fetch
3. If failed, revert and document error
4. Continue through remaining packages in order
5. Update CLAUDE.md with final results