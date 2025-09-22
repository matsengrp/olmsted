// ESLint local rules plugin
// This allows us to use custom rules in our .eslintrc

module.exports = {
  'max-exported-classes-per-file': require('./eslint-rules/max-exported-classes-per-file')
};