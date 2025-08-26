/**
 * Test Runner for Olmsted Performance Tests
 * This manages the test execution and UI updates
 */

let testResults = [];
let currentTester = null;

function log(message, type = 'info') {
    const console = document.getElementById('console');
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    console.appendChild(entry);
    console.scrollTop = console.scrollHeight;
}

function clearConsole() {
    document.getElementById('console').innerHTML = '';
}

function clearResults() {
    document.getElementById('test-output').innerHTML = '<p style="color: #666;">No tests run yet.</p>';
    document.getElementById('summary').style.display = 'none';
    clearConsole();
    testResults = [];
}

function openWebapp() {
    const url = document.getElementById('webapp-url').value;
    const frame = document.getElementById('webapp-frame');
    frame.src = url;
    frame.style.display = 'block';
    log(`Opening webapp at ${url}`, 'info');
}

function updateTestResult(name, status, metrics = null) {
    const outputDiv = document.getElementById('test-output');
    let testDiv = document.getElementById(`test-${name.replace(/\s+/g, '-')}`);
    
    if (!testDiv) {
        testDiv = document.createElement('div');
        testDiv.id = `test-${name.replace(/\s+/g, '-')}`;
        testDiv.className = 'test-result';
        
        if (outputDiv.querySelector('p')) {
            outputDiv.innerHTML = '';
        }
        outputDiv.appendChild(testDiv);
    }
    
    testDiv.className = `test-result ${status}`;
    
    let html = `<div class="test-name">${name}</div>`;
    
    if (metrics) {
        html += '<div class="test-metrics">';
        if (metrics.timing) {
            html += `Average: ${metrics.timing.average}ms | `;
            html += `Median: ${metrics.timing.median}ms | `;
            html += `Min: ${metrics.timing.min}ms | `;
            html += `Max: ${metrics.timing.max}ms`;
        }
        if (metrics.memory && metrics.memory.averageDelta) {
            html += ` | Memory Δ: ${metrics.memory.averageDelta}MB`;
        }
        html += '</div>';
    } else if (status === 'running') {
        html += '<div class="test-metrics">Running...</div>';
    }
    
    testDiv.innerHTML = html;
}

function updateSummary(results) {
    const summaryDiv = document.getElementById('summary');
    const metricsDiv = document.getElementById('metrics');
    
    summaryDiv.style.display = 'block';
    
    // Calculate summary metrics
    const performanceTests = results.filter(r => r.timing);
    const passedTests = performanceTests.filter(r => r.passed).length;
    const totalTests = performanceTests.length;
    
    // Find memory test
    const memoryTest = results.find(r => r.name === 'Memory Usage');
    
    // Create metric cards
    let metricsHTML = '';
    
    metricsHTML += `
        <div class="metric-card">
            <div class="metric-label">Tests Passed</div>
            <div class="metric-value">${passedTests}/${totalTests}</div>
        </div>
    `;
    
    // Add key performance metrics
    const keyMetrics = [
        { name: 'Dataset Loading', target: 2000, unit: 'ms' },
        { name: 'Tree Switching', target: 100, unit: 'ms' },
        { name: 'Virtual Scrolling', target: 50, unit: 'ms' }
    ];
    
    keyMetrics.forEach(metric => {
        const test = results.find(r => r.name === metric.name);
        if (test && test.timing) {
            const value = parseFloat(test.timing.average);
            const passed = !metric.target || value <= metric.target;
            metricsHTML += `
                <div class="metric-card">
                    <div class="metric-label">${metric.name}</div>
                    <div class="metric-value" style="color: ${passed ? '#28a745' : '#dc3545'}">
                        ${value.toFixed(0)}<span class="metric-unit">${metric.unit}</span>
                    </div>
                    ${metric.target ? `<div class="metric-label">Target: <${metric.target}${metric.unit}</div>` : ''}
                </div>
            `;
        }
    });
    
    // Add memory metrics if available
    if (memoryTest && memoryTest.memory) {
        metricsHTML += `
            <div class="metric-card">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value">${memoryTest.memory.used}<span class="metric-unit">MB</span></div>
                <div class="metric-label">of ${memoryTest.memory.limit}MB available</div>
            </div>
        `;
        
        if (memoryTest.totalClones) {
            metricsHTML += `
                <div class="metric-card">
                    <div class="metric-label">Dataset Size</div>
                    <div class="metric-value">${memoryTest.totalClones}</div>
                    <div class="metric-label">clonal families</div>
                </div>
            `;
        }
    }
    
    metricsDiv.innerHTML = metricsHTML;
}

async function runAllTests() {
    clearResults();
    log('Starting performance tests...', 'info');
    
    const iterations = parseInt(document.getElementById('iterations').value);
    const fileInput = document.getElementById('test-file');
    
    if (!fileInput.files.length) {
        log('Please select a test data file first', 'error');
        return;
    }
    
    // Disable buttons during test
    document.getElementById('run-all').disabled = true;
    document.getElementById('run-selected').disabled = true;
    
    try {
        // Check if webapp is loaded
        const frame = document.getElementById('webapp-frame');
        if (!frame.src) {
            log('Opening webapp...', 'info');
            openWebapp();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Get webapp window
        const webappWindow = frame.contentWindow;
        
        if (!webappWindow.OlmstedPerformanceTester) {
            log('Loading performance tester into webapp...', 'info');
            
            // Inject the performance tester script
            const script = webappWindow.document.createElement('script');
            script.src = '../../tests/performance/performanceTest.js';
            webappWindow.document.head.appendChild(script);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Create tester instance
        currentTester = new webappWindow.OlmstedPerformanceTester();
        
        // Check if data is loaded
        if (!webappWindow.store) {
            log('Redux store not found. Make sure webapp is loaded.', 'error');
            return;
        }
        
        const state = webappWindow.store.getState();
        const datasets = state.datasets.availableDatasets || [];
        
        if (datasets.length === 0) {
            log('No datasets loaded. Please upload test data through the webapp UI.', 'warn');
            log('After uploading, run tests again.', 'info');
            return;
        }
        
        log(`Found ${datasets.length} dataset(s) loaded`, 'success');
        
        // Run each test
        const tests = [
            { name: 'Dataset Loading', method: 'testDatasetLoading' },
            { name: 'Table Rendering', method: 'testTableRendering' },
            { name: 'Virtual Scrolling', method: 'testVirtualScrolling' },
            { name: 'Tree Loading', method: 'testTreeLoading' },
            { name: 'Tree Switching', method: 'testTreeSwitching' },
            { name: 'Memory Usage', method: 'testMemoryUsage' }
        ];
        
        for (const test of tests) {
            log(`Running ${test.name}...`, 'info');
            updateTestResult(test.name, 'running');
            
            try {
                const result = await currentTester.measurePerformance(
                    test.name,
                    async () => await currentTester[test.method](),
                    test.name === 'Memory Usage' ? 1 : iterations
                );
                
                if (result) {
                    testResults.push(result);
                    const passed = result.passed !== false;
                    updateTestResult(test.name, passed ? 'pass' : 'fail', result);
                    log(`${test.name}: ${result.timing ? result.timing.average + 'ms' : 'Complete'}`, 
                        passed ? 'success' : 'warn');
                }
            } catch (error) {
                log(`${test.name} failed: ${error.message}`, 'error');
                updateTestResult(test.name, 'fail');
            }
        }
        
        // Update summary
        updateSummary(testResults);
        log('All tests complete!', 'success');
        
    } catch (error) {
        log(`Test error: ${error.message}`, 'error');
    } finally {
        document.getElementById('run-all').disabled = false;
        document.getElementById('run-selected').disabled = false;
    }
}

async function runSelectedTests() {
    // Get selected tests
    const checkboxes = document.querySelectorAll('input[name="test"]:checked');
    const selectedTests = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedTests.length === 0) {
        log('No tests selected', 'warn');
        return;
    }
    
    log(`Running ${selectedTests.length} selected tests...`, 'info');
    
    // Similar to runAllTests but filtered
    // Implementation would follow the same pattern but only run selected tests
    log('Selected tests feature coming soon...', 'info');
}

function exportResults() {
    if (testResults.length === 0) {
        log('No results to export', 'warn');
        return;
    }
    
    const exportData = {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        results: testResults
    };
    
    const json = JSON.stringify(exportData, null, 2);
    
    // Create download link
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `olmsted-perf-results-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    log('Results exported to file', 'success');
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    log('Performance test runner ready', 'info');
    log('1. Click "Open in iFrame" to load the webapp', 'info');
    log('2. Upload test data through the webapp UI', 'info');
    log('3. Click "Run All Tests" to start performance testing', 'info');
});