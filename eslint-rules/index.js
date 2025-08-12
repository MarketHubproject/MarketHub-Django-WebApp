/**
 * ESLint plugin for MarketHub Mobile
 * Contains custom rules to prevent regression of Chinese Unicode characters
 */

const noChinese = require('./no-chinese-unicode');

module.exports = {
  rules: {
    'no-chinese-unicode': noChinese,
  },
  configs: {
    recommended: {
      rules: {
        'markethub/no-chinese-unicode': 'error',
      },
    },
  },
};
