# Olmsted Performance Testing Guide

## Overview

This directory contains performance testing tools for the Olmsted webapp to ensure it meets specified performance targets for academic use with large datasets.

## Performance Targets

| Metric | Target | Description |
|--------|--------|-------------|
| **Initial Load** | < 2 seconds | Loading time for 10MB datasets |
| **Tree Switching** | < 100ms | Switching between trees (from memory) |
| **Table Scrolling** | Smooth | Virtual scrolling with 1000+ rows |
| **Memory Usage** | < 500MB | For datasets with 1000+ clones |

## Quick Start

### 1. Generate Test Data

**Prerequisites**: 
- Install olmsted CLI: `pip install -e olmsted-cli/` (from project root)

```bash
# From tests/performance directory
./generate_perf_tests.sh

# Or generate specific sizes
python3 generate_test_data.py \
  --clones 1000 \
  --nodes 50 \
  --name "my_test" \
  --output "test_data/my_test.json"
```

### 2. Start the Webapp

```bash
cd olmsted
npm start
```

### 3. Run Performance Tests

#### Option A: Web-based Test Runner (Recommended)

```bash
cd olmsted
npm run test:perf:serve
```

This opens `http://localhost:8080` with a visual test interface featuring:
- Real-time test results display
- Performance metrics dashboard
- Test selection and configuration
- Console output logging
- JSON export functionality

#### Option B: Manual Browser Testing

1. Navigate to http://localhost:4000
2. Upload your test dataset through the UI
3. Open browser console (F12)
4. Run:

```javascript
const tester = new OlmstedPerformanceTester();
await tester.runAllTests();
tester.exportResults();
```

## File Structure

```
tests/performance/
├── README.md                 # This file
├── index.html               # Web-based test runner interface
├── performanceTest.js       # Core performance testing class
└── testRunner.js           # Test runner logic and UI management
```

## Test Descriptions

### Dataset Loading Test
- **Purpose**: Measure time to load clonal families from dataset
- **Target**: < 2 seconds for medium dataset (1000 clones)
- **What it tests**: Redux state updates, data parsing, client-side processing

### Table Rendering Test
- **Purpose**: Measure time to render the clonal families table
- **What it tests**: Virtual scrolling implementation, React rendering
- **Iterations**: 3 runs for statistical accuracy

### Virtual Scrolling Test
- **Purpose**: Simulate rapid scrolling through table
- **Target**: Smooth 60fps scrolling
- **What it tests**: Performance under scroll stress, virtual item rendering

### Tree Loading Test
- **Purpose**: Measure time to load and render phylogenetic trees
- **What it tests**: D3 rendering performance, tree data processing
- **Scope**: Tests first 5 families in dataset

### Tree Switching Test
- **Purpose**: Measure time to switch between loaded trees
- **Target**: < 100ms (trees already in memory)
- **What it tests**: Redux state updates, re-rendering efficiency

### Memory Usage Test
- **Purpose**: Report current memory consumption
- **Requirements**: Chrome with `--enable-precise-memory-info` flag
- **What it measures**: Heap size, memory usage per clone

## Test Data

The test generator creates datasets of various sizes:

| Dataset | Clones | Approx Size | Purpose |
|---------|--------|-------------|---------|
| `perf_test_small` | 100 | ~5MB | Quick testing & development |
| `perf_test_medium` | 1000 | ~50MB | **Primary performance target** |
| `perf_test_large` | 5000 | ~250MB | Stress testing |
| `perf_test_xlarge` | 10000 | ~500MB | Edge case testing |
| `perf_test_10mb` | ~200 | 10MB | File size target testing |

## Interpreting Results

### Example Output

```
📊 PERFORMANCE TEST RESULTS
===========================
✅ Dataset Loading: 1543.21ms (target: <2000ms)
✅ Table Rendering: 45.32ms
✅ Virtual Scrolling: 23.45ms (target: <50ms)
✅ Tree Loading: 234.56ms
✅ Tree Switching: 89.23ms (target: <100ms)

📈 Summary:
Tests Passed: 5/5

💾 Memory Usage:
  Datasets: 1
  Total Clones: 1000
  Total Trees: 1000
  Heap Used: 245.3MB / 4096.0MB
```

### Performance Analysis

- **Green checkmarks (✅)**: Test passed performance target
- **Yellow warnings (⚠️)**: Test completed but exceeded target
- **Red X (❌)**: Test failed or encountered error

## Chrome Performance Profiling

For detailed analysis:

1. Open Chrome DevTools (F12)
2. Go to Performance tab
3. Click Record (or Ctrl+E)
4. Perform actions in the webapp
5. Stop recording and analyze flame graph

### Enable Precise Memory Info

For accurate memory measurements:

```bash
# Linux/Mac
google-chrome --enable-precise-memory-info

# Windows
chrome.exe --enable-precise-memory-info
```

## Troubleshooting

### Tests Not Running
- Ensure Redux store is available: `window.store` should exist
- Check that datasets are loaded before running tests
- Verify browser console has no errors

### Memory Test Not Working
- Restart Chrome with `--enable-precise-memory-info` flag
- Check `performance.memory` is available in console

### Slow Performance
- Check browser extensions (disable for testing)
- Ensure production build: `npm run build` then serve
- Close other tabs to free memory
- Use Chrome's Performance profiler for bottleneck identification

## Optimization Checklist

Based on test results, consider these optimizations:

- [ ] **Lazy Loading**: Load clones on demand rather than all at once
- [ ] **Data Chunking**: Split large datasets into chunks
- [ ] **Web Workers**: Move data processing off main thread
- [ ] **Memoization**: Cache computed values in selectors
- [ ] **Tree Virtualization**: Only render visible tree nodes
- [ ] **Compression**: Use gzip for data transfer
- [ ] **IndexedDB**: Store processed data locally

## Success Criteria

✅ **Single consolidated file format** - Implemented  
✅ **Better performance with large datasets** - Virtual scrolling added  
✅ **Loading indicators provide feedback** - Progress bars implemented  
✅ **Trees load instantly from memory** - Trees cached in Redux store

## Automated Testing (CI/CD)

For automated testing, use Puppeteer:

```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:4000');
  
  // Upload test file and run tests
  const results = await page.evaluate(() => {
    const tester = new OlmstedPerformanceTester();
    return tester.runAllTests();
  });
  
  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
```

## Contributing

To add new performance tests:

1. Add test method to `performanceTest.js`
2. Update test runner UI in `index.html`
3. Add test to the runner in `testRunner.js`
4. Update this README with test description