/**
 * APTL (AI Prompt Template Language) syntax highlighting for Prism.js
 * Based on the VS Code extension grammar
 */

(function (Prism) {
  Prism.languages.aptl = {
    // Comments (line and block)
    comment: [
      {
        pattern: /\/\/.*/,
        greedy: true,
      },
      {
        pattern: /\/\*[\s\S]*?\*\//,
        greedy: true,
      },
    ],

    // Variables: @{variable.path|"default"}
    variable: {
      pattern: /@\{[^}]+\}/,
      inside: {
        punctuation: /^@\{|\}$/,
        operator: /\|/,
        string: {
          pattern: /(\|)\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/,
          lookbehind: true,
          greedy: true,
        },
        property: /[a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[\d+\])*/,
      },
    },

    // Directive end
    keyword: [
      {
        pattern: /@end\b/,
        alias: 'directive-end',
      },
      {
        pattern: /\b(?:in|with|or|and)\b/,
        alias: 'directive-keyword',
      },
    ],

    // Directives: @section, @if, @each, etc.
    directive: {
      pattern: /@[a-zA-Z_][a-zA-Z0-9_]*(?!\{)/,
      inside: {
        punctuation: /^@/,
      },
    },

    // Strings in directive arguments
    string: [
      {
        pattern: /"(?:\\.|[^"\\])*"/,
        greedy: true,
      },
      {
        pattern: /'(?:\\.|[^'\\])*'/,
        greedy: true,
      },
    ],

    // Named arguments: key=value
    'attr-name': /[a-zA-Z_][a-zA-Z0-9_]*(?=\s*=)/,

    // Constants
    boolean: /\b(?:true|false)\b/,
    number: /\b\d+(?:\.\d+)?\b/,

    // Operators and punctuation
    operator: /=/,
    punctuation: /[{}[\]():,]/,

    // Escaped characters
    escape: /\\[@/\\ntr]/,
  };

  // Alias for code blocks
  Prism.languages.apt = Prism.languages.aptl;
})(Prism);
