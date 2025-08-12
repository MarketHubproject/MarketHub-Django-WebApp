/**
 * ESLint rule to prevent Chinese Unicode characters in source code
 * This rule detects Unicode characters in the CJK (Chinese, Japanese, Korean) range
 * specifically targeting Chinese characters (U+4E00-U+9FFF)
 */

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent Chinese Unicode characters in source code',
      category: 'Possible Errors',
      recommended: true,
    },
    fixable: null,
    schema: [],
    messages: {
      chineseCharacterFound: 'Chinese Unicode character detected at position {{position}}: "{{character}}". Use i18n translation keys instead.',
    },
  },
  
  create(context) {
    const sourceCode = context.getSourceCode();
    
    // Unicode range for Chinese characters (Han script)
    // U+4E00-U+9FFF covers most commonly used Chinese characters
    const chineseCharacterRegex = /[\u4e00-\u9fff]/g;
    
    return {
      Program() {
        const text = sourceCode.getText();
        let match;
        
        // Reset regex lastIndex to ensure we find all matches
        chineseCharacterRegex.lastIndex = 0;
        
        while ((match = chineseCharacterRegex.exec(text)) !== null) {
          const character = match[0];
          const position = match.index;
          
          // Get the line and column for better error reporting
          const loc = sourceCode.getLocFromIndex(position);
          
          context.report({
            loc,
            messageId: 'chineseCharacterFound',
            data: {
              character,
              position,
            },
          });
        }
      },
    };
  },
};
