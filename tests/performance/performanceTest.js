/**
 * Performance Testing Suite for Olmsted Webapp
 * 
 * Run from browser console with: 
 * const tester = new OlmstedPerformanceTester(); 
 * await tester.runAllTests();
 */

class OlmstedPerformanceTester {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      tests: []
    };
    this.currentDatasetId = null;
  }

  /**
   * Measure performance of a function
   */
  async measurePerformance(name, fn, iterations = 1) {
    console.log(`🧪 Testing: ${name}`);
    
    const measurements = [];
    
    for (let i = 0; i < iterations; i++) {
      // Force garbage collection if available
      if (window.gc) window.gc();
      
      // Measure memory before
      const memBefore = performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
      
      // Measure time
      const startTime = performance.now();
      
      try {
        await fn();
      } catch (error) {
        console.error(`Error in ${name}:`, error);
        return null;
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Measure memory after
      const memAfter = performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize
      } : null;
      
      measurements.push({
        duration,
        memoryDelta: memAfter && memBefore ? 
          (memAfter.usedJSHeapSize - memBefore.usedJSHeapSize) / (1024 * 1024) : null
      });
      
      // Small delay between iterations
      if (i < iterations - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Calculate statistics
    const durations = measurements.map(m => m.duration);
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    const min = Math.min(...durations);
    const max = Math.max(...durations);
    const median = durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)];
    
    const result = {
      name,
      iterations,
      timing: {
        average: avg.toFixed(2),
        median: median.toFixed(2),
        min: min.toFixed(2),
        max: max.toFixed(2),
        unit: 'ms'
      },
      memory: measurements[0].memoryDelta !== null ? {
        averageDelta: (measurements.reduce((a, m) => a + m.memoryDelta, 0) / measurements.length).toFixed(2),
        unit: 'MB'
      } : null,
      passed: true,
      measurements
    };
    
    console.log(`✅ ${name}: ${avg.toFixed(2)}ms (median: ${median.toFixed(2)}ms)`);
    
    this.results.tests.push(result);
    return result;
  }

  /**
   * Test 1: File Upload and Processing
   */
  async testFileUpload(filePath) {
    // This test requires a file to be selected manually
    console.log('📁 File upload test requires manual file selection');
    console.log('Please use the UI to upload your test file, then continue tests');
    return null;
  }

  /**
   * Test 2: Initial Dataset Loading
   */
  async testDatasetLoading() {
    return await this.measurePerformance('Dataset Loading', async () => {
      // Find the first available dataset
      const state = window.store.getState();
      const datasets = state.datasets.availableDatasets;
      
      if (!datasets || datasets.length === 0) {
        throw new Error('No datasets available');
      }
      
      const dataset = datasets.find(d => !d.loading || d.loading !== 'DONE') || datasets[0];
      this.currentDatasetId = dataset.dataset_id;
      
      // Simulate clicking on the dataset
      window.store.dispatch({
        type: 'LOADING_DATASET',
        dataset_id: dataset.dataset_id,
        loading: 'LOADING'
      });
      
      // Load clonal families
      const { getClonalFamilies } = await import('../actions/loadData');
      const { getClientClonalFamilies } = await import('../actions/clientDataLoader');
      
      if (dataset.isClientSide) {
        await new Promise(resolve => {
          getClientClonalFamilies(window.store.dispatch, dataset.dataset_id);
          setTimeout(resolve, 100);
        });
      } else {
        await new Promise(resolve => {
          getClonalFamilies(window.store.dispatch, dataset.dataset_id);
          setTimeout(resolve, 100);
        });
      }
      
      // Wait for loading to complete
      await new Promise(resolve => {
        const checkLoaded = setInterval(() => {
          const state = window.store.getState();
          const dataset = state.datasets.availableDatasets.find(d => d.dataset_id === this.currentDatasetId);
          if (dataset && dataset.loading === 'DONE') {
            clearInterval(checkLoaded);
            resolve();
          }
        }, 50);
      });
    });
  }

  /**
   * Test 3: Table Rendering Performance
   */
  async testTableRendering() {
    const state = window.store.getState();
    const families = state.clonalFamilies.byDatasetId[this.currentDatasetId];
    
    if (!families) {
      console.warn('No families loaded for table test');
      return null;
    }
    
    console.log(`Testing table with ${families.length} families`);
    
    return await this.measurePerformance('Table Rendering', async () => {
      // Force re-render by changing pagination
      window.store.dispatch({
        type: 'TOGGLE_SORT',
        order_by: 'unique_seqs_count'
      });
      
      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Toggle back
      window.store.dispatch({
        type: 'TOGGLE_SORT',
        order_by: 'unique_seqs_count'
      });
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }, 3);
  }

  /**
   * Test 4: Virtual Scrolling Performance
   */
  async testVirtualScrolling() {
    return await this.measurePerformance('Virtual Scrolling', async () => {
      const scrollContainer = document.querySelector('[style*="overflow"]');
      if (!scrollContainer) {
        throw new Error('Scroll container not found');
      }
      
      // Scroll down
      for (let i = 0; i < 10; i++) {
        scrollContainer.scrollTop += 200;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
      
      // Scroll up
      for (let i = 0; i < 10; i++) {
        scrollContainer.scrollTop -= 200;
        await new Promise(resolve => requestAnimationFrame(resolve));
      }
    }, 3);
  }

  /**
   * Test 5: Tree Loading Performance
   */
  async testTreeLoading() {
    const state = window.store.getState();
    const families = state.clonalFamilies.byDatasetId[this.currentDatasetId];
    
    if (!families || families.length === 0) {
      console.warn('No families for tree test');
      return null;
    }
    
    // Select first 5 families and measure tree loading
    const testFamilies = families.slice(0, Math.min(5, families.length));
    
    return await this.measurePerformance('Tree Loading', async () => {
      for (const family of testFamilies) {
        // Select the family
        window.store.dispatch({
          type: 'SELECT_FAMILY',
          family: family.ident
        });
        
        // Wait for tree to load
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    });
  }

  /**
   * Test 6: Tree Switching Performance
   */
  async testTreeSwitching() {
    const state = window.store.getState();
    const families = state.clonalFamilies.byDatasetId[this.currentDatasetId];
    
    if (!families || families.length < 2) {
      console.warn('Not enough families for tree switching test');
      return null;
    }
    
    const family1 = families[0];
    const family2 = families[1];
    
    return await this.measurePerformance('Tree Switching', async () => {
      // Switch between two families
      window.store.dispatch({
        type: 'SELECT_FAMILY',
        family: family1.ident
      });
      
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      window.store.dispatch({
        type: 'SELECT_FAMILY',
        family: family2.ident
      });
      
      await new Promise(resolve => requestAnimationFrame(resolve));
    }, 10);
  }

  /**
   * Test 7: Memory Usage with Large Dataset
   */
  async testMemoryUsage() {
    if (!performance.memory) {
      console.warn('Memory API not available (requires Chrome with --enable-precise-memory-info)');
      return null;
    }
    
    const state = window.store.getState();
    const datasets = state.datasets.availableDatasets;
    const clonalFamilies = state.clonalFamilies.byDatasetId;
    const trees = state.trees.trees;
    
    const stats = {
      name: 'Memory Usage',
      datasets: datasets.length,
      totalClones: Object.values(clonalFamilies).reduce((sum, families) => sum + (families?.length || 0), 0),
      totalTrees: Object.keys(trees).length,
      memory: {
        used: (performance.memory.usedJSHeapSize / (1024 * 1024)).toFixed(2),
        total: (performance.memory.totalJSHeapSize / (1024 * 1024)).toFixed(2),
        limit: (performance.memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2),
        unit: 'MB'
      }
    };
    
    console.log(`💾 Memory: ${stats.memory.used}MB / ${stats.memory.total}MB (limit: ${stats.memory.limit}MB)`);
    this.results.tests.push(stats);
    
    return stats;
  }

  /**
   * Run all performance tests
   */
  async runAllTests() {
    console.log('🚀 Starting Olmsted Performance Tests');
    console.log('=====================================');
    
    // Check if store is available
    if (!window.store) {
      console.error('Redux store not found. Are you on the Olmsted webapp?');
      return null;
    }
    
    // Get current state info
    const state = window.store.getState();
    const datasets = state.datasets.availableDatasets || [];
    
    console.log(`Found ${datasets.length} dataset(s)`);
    
    if (datasets.length === 0) {
      console.warn('No datasets loaded. Please load a dataset first.');
      return null;
    }
    
    // Run tests
    await this.testDatasetLoading();
    await this.testTableRendering();
    await this.testVirtualScrolling();
    await this.testTreeLoading();
    await this.testTreeSwitching();
    await this.testMemoryUsage();
    
    // Generate report
    this.generateReport();
    
    return this.results;
  }

  /**
   * Generate a summary report
   */
  generateReport() {
    console.log('\n📊 PERFORMANCE TEST RESULTS');
    console.log('===========================');
    
    const performanceTargets = {
      'Dataset Loading': 2000,  // < 2 seconds
      'Tree Switching': 100,     // < 100ms
      'Virtual Scrolling': 50    // < 50ms for smooth scrolling
    };
    
    let passedCount = 0;
    let totalCount = 0;
    
    this.results.tests.forEach(test => {
      if (test.timing) {
        totalCount++;
        const target = performanceTargets[test.name];
        const avgTime = parseFloat(test.timing.average);
        const passed = !target || avgTime <= target;
        
        if (passed) passedCount++;
        
        const icon = passed ? '✅' : '⚠️';
        const targetStr = target ? ` (target: <${target}ms)` : '';
        
        console.log(`${icon} ${test.name}: ${test.timing.average}ms${targetStr}`);
        
        if (test.memory) {
          console.log(`   Memory Δ: ${test.memory.averageDelta}MB`);
        }
      }
    });
    
    console.log('\n📈 Summary:');
    console.log(`Tests Passed: ${passedCount}/${totalCount}`);
    
    // Memory summary
    const memTest = this.results.tests.find(t => t.name === 'Memory Usage');
    if (memTest) {
      console.log(`\n💾 Memory Usage:`);
      console.log(`  Datasets: ${memTest.datasets}`);
      console.log(`  Total Clones: ${memTest.totalClones}`);
      console.log(`  Total Trees: ${memTest.totalTrees}`);
      console.log(`  Heap Used: ${memTest.memory.used}MB / ${memTest.memory.limit}MB`);
    }
    
    console.log('\n✨ Test complete! Results stored in tester.results');
    console.log('To export: copy(JSON.stringify(tester.results, null, 2))');
  }

  /**
   * Export results to clipboard
   */
  exportResults() {
    const json = JSON.stringify(this.results, null, 2);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(json).then(() => {
        console.log('📋 Results copied to clipboard!');
      });
    } else {
      console.log('Results:', json);
    }
  }
}

// Make it available globally for console access
window.OlmstedPerformanceTester = OlmstedPerformanceTester;

// Export for module usage
export default OlmstedPerformanceTester;