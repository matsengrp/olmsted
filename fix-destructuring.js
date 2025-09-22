#!/usr/bin/env node

/**
 * Script to help fix React destructuring-assignment ESLint errors
 * Analyzes files and suggests destructuring fixes
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

/**
 * Find all props and state references in a file
 */
function findReferences(content) {
  const propsRegex = /this\.props\.(\w+)/g;
  const stateRegex = /this\.state\.(\w+)/g;
  
  const props = new Set();
  const state = new Set();
  
  let match;
  while ((match = propsRegex.exec(content)) !== null) {
    props.add(match[1]);
  }
  
  while ((match = stateRegex.exec(content)) !== null) {
    state.add(match[1]);
  }
  
  return { props: Array.from(props), state: Array.from(state) };
}

/**
 * Find all methods in a React class component
 */
function findMethods(content) {
  const methods = [];
  
  // Match regular methods
  const methodRegex = /^\s*(async\s+)?(\w+)\s*\([^)]*\)\s*{/gm;
  let match;
  while ((match = methodRegex.exec(content)) !== null) {
    const methodName = match[2];
    if (methodName !== 'constructor') {
      methods.push({
        name: methodName,
        isAsync: !!match[1],
        startIndex: match.index,
        line: content.substring(0, match.index).split('\n').length
      });
    }
  }
  
  // Match arrow function class properties
  const arrowMethodRegex = /^\s*(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>\s*{/gm;
  while ((match = arrowMethodRegex.exec(content)) !== null) {
    methods.push({
      name: match[1],
      isArrow: true,
      startIndex: match.index,
      line: content.substring(0, match.index).split('\n').length
    });
  }
  
  return methods;
}

/**
 * Generate destructuring statement
 */
function generateDestructuring(props, state, isRender = false) {
  const statements = [];
  
  if (props.length > 0) {
    if (props.length <= 3) {
      statements.push(`const { ${props.join(', ')} } = this.props;`);
    } else {
      // Multi-line for many props
      statements.push(`const {
      ${props.join(',\n      ')}
    } = this.props;`);
    }
  }
  
  if (state.length > 0) {
    if (state.length <= 3) {
      statements.push(`const { ${state.join(', ')} } = this.state;`);
    } else {
      statements.push(`const {
      ${state.join(',\n      ')}
    } = this.state;`);
    }
  }
  
  return statements.join('\n    ');
}

/**
 * Analyze a single file
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const { props, state } = findReferences(content);
  const methods = findMethods(content);
  
  console.log(`\n${colors.blue}${colors.bright}File: ${filePath}${colors.reset}`);
  console.log(`${colors.yellow}Found references:${colors.reset}`);
  console.log(`  Props: ${props.length > 0 ? props.join(', ') : 'none'}`);
  console.log(`  State: ${state.length > 0 ? state.join(', ') : 'none'}`);
  
  if (props.length === 0 && state.length === 0) {
    console.log(`${colors.green}✓ No destructuring needed${colors.reset}`);
    return;
  }
  
  console.log(`\n${colors.yellow}Suggested fixes:${colors.reset}`);
  
  // Show destructuring for render method specifically
  const renderMethod = methods.find(m => m.name === 'render');
  if (renderMethod) {
    console.log(`\n${colors.bright}For render() method (line ~${renderMethod.line}):${colors.reset}`);
    console.log('    ' + generateDestructuring(props, state, true));
  }
  
  // Show for other methods that might need it
  const otherMethods = methods.filter(m => 
    m.name !== 'render' && 
    !m.name.startsWith('component') &&
    m.name !== 'constructor'
  );
  
  if (otherMethods.length > 0) {
    console.log(`\n${colors.bright}For other methods:${colors.reset}`);
    console.log('    ' + generateDestructuring(props, state));
  }
  
  console.log(`\n${colors.bright}To apply:${colors.reset}`);
  console.log('1. Add the destructuring line(s) at the start of each method');
  console.log('2. Remove all "this.props." and "this.state." prefixes');
  console.log(`3. Run: ${colors.green}npm run lint ${filePath}${colors.reset} to verify`);
  
  return { props, state, methods };
}

/**
 * Generate a fixed version of the file (experimental)
 */
function generateFixedFile(filePath, outputPath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const { props, state } = findReferences(content);
  
  if (props.length === 0 && state.length === 0) {
    console.log(`${colors.green}No changes needed for ${filePath}${colors.reset}`);
    return;
  }
  
  // Find render method and add destructuring
  const renderRegex = /(\s+render\s*\(\s*\)\s*{\s*\n)/g;
  if (renderRegex.test(content)) {
    content = content.replace(renderRegex, (match) => {
      const destructuring = generateDestructuring(props, state, true);
      return match + '    ' + destructuring + '\n';
    });
  }
  
  // Replace all this.props.X with X
  props.forEach(prop => {
    const regex = new RegExp(`this\\.props\\.${prop}\\b`, 'g');
    content = content.replace(regex, prop);
  });
  
  // Replace all this.state.X with X
  state.forEach(s => {
    const regex = new RegExp(`this\\.state\\.${s}\\b`, 'g');
    content = content.replace(regex, s);
  });
  
  fs.writeFileSync(outputPath, content);
  console.log(`${colors.green}✓ Generated fixed file: ${outputPath}${colors.reset}`);
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`${colors.bright}Usage:${colors.reset}`);
  console.log('  node fix-destructuring.js <file>        - Analyze a file');
  console.log('  node fix-destructuring.js <file> --fix  - Generate fixed version');
  console.log('\nExample:');
  console.log('  node fix-destructuring.js src/components/explorer/table.js');
  console.log('  node fix-destructuring.js src/components/explorer/table.js --fix');
  process.exit(0);
}

const filePath = args[0];
const shouldFix = args[1] === '--fix';

if (!fs.existsSync(filePath)) {
  console.error(`${colors.red}Error: File not found: ${filePath}${colors.reset}`);
  process.exit(1);
}

if (shouldFix) {
  const outputPath = filePath.replace('.js', '.fixed.js');
  generateFixedFile(filePath, outputPath);
} else {
  analyzeFile(filePath);
}