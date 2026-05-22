#!/usr/bin/env node

/**
 * Setup script for local ESLint plugin
 * This creates the necessary files in node_modules/eslint-plugin-local/
 * to make our custom ESLint rules available.
 *
 * This script is run automatically after npm install via postinstall hook.
 */

const fs = require('fs');
const path = require('path');

const pluginDir = path.join(__dirname, '..', 'node_modules', 'eslint-plugin-local');

// Create plugin directory if it doesn't exist
if (!fs.existsSync(pluginDir)) {
  fs.mkdirSync(pluginDir, { recursive: true });
}

// Create package.json
const packageJson = {
  name: 'eslint-plugin-local',
  version: '1.0.0',
  description: 'Local ESLint plugin for custom rules',
  main: 'index.js'
};

fs.writeFileSync(
  path.join(pluginDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

// Create index.js that references our custom rules
const indexJs = `// ESLint local rules plugin
// This allows us to use custom rules in our .eslintrc

module.exports = {
  rules: {
    'max-exported-classes-per-file': require('../../eslint-rules/max-exported-classes-per-file')
  }
};
`;

fs.writeFileSync(
  path.join(pluginDir, 'index.js'),
  indexJs
);

console.log('✓ ESLint local plugin setup complete');