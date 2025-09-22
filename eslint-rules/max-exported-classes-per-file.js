/**
 * Custom ESLint rule: max-exported-classes-per-file
 * Allows unlimited private classes but restricts exported classes to 1 per file
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce maximum number of exported classes per file',
      category: 'Best Practices',
      recommended: false
    },
    fixable: null,
    schema: [
      {
        type: 'integer',
        minimum: 1
      }
    ],
    messages: {
      maximumExceeded: 'File has {{classCount}} exported classes. Maximum allowed is {{max}}.'
    }
  },

  create(context) {
    const option = context.options[0] || 1;
    let exportedClassCount = 0;

    return {
      'ExportDefaultDeclaration > ClassDeclaration'() {
        exportedClassCount++;
      },
      'ExportNamedDeclaration > ClassDeclaration'() {
        exportedClassCount++;
      },
      'Program:exit'(node) {
        if (exportedClassCount > option) {
          context.report({
            node,
            messageId: 'maximumExceeded',
            data: {
              classCount: exportedClassCount,
              max: option
            }
          });
        }
      }
    };
  }
};