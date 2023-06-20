/**
 * @file Runs `prettier` as an ESLint rule.
 * @author Andres Suarez
 */

'use strict';

// This test is optimized for debuggability.
// Please do not attempt to DRY this file or dynamically load the fixtures.

// ------------------------------------------------------------------------------
// Requirements
// ------------------------------------------------------------------------------

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const { ESLint, RuleTester } = require('eslint');

const eslintPluginPrettier = require('..');

const rule = eslintPluginPrettier.rules.prettier;

// ------------------------------------------------------------------------------
// Tests
// ------------------------------------------------------------------------------

const eslint = new ESLint({
  baseConfig: {
    parserOptions: {
      ecmaVersion: 'latest',
      ecmaFeatures: {
        jsx: true,
      },
      sourceType: 'module',
    },
    extends: 'plugin:prettier/recommended',
    overrides: [
      {
        files: '*.mdx',
        extends: 'plugin:mdx/recommended',
        settings: {
          'mdx/code-block': true,
        },
      },
      // To test 'forceFormatExtracted' option
      {
        files: '**/*.md',
        plugins: ['markdown'],
        processor: 'markdown/markdown',
        rules: {
          'prettier/prettier': 'off',
        },
      },
      {
        files: '**/*.md/*.js',
        rules: {
          'prettier/prettier': ['error', {}, { forceFormatExtracted: true }],
        },
      },
      {
        files: '**/eslint-plugin-svelte3/*.svelte',
        plugins: ['svelte3'],
        processor: 'svelte3/svelte3',
      },
      {
        files: '**/eslint-plugin-svelte3/*.named-blocks.svelte',
        settings: {
          'svelte3/named-blocks': true,
        },
      },
      {
        files: '**/eslint-plugin-svelte/*.svelte',
        extends: ['plugin:svelte/recommended'],
      },
    ],
  },
  useEslintrc: false,
  ignore: false,
});

const ruleTester = new RuleTester();

ruleTester.run('prettier', rule, {
  valid: [
    // Correct style. Also proves that the plugin works if no filename is provided
    { code: `'';\n` },
    // Double quote from .prettierrc.
    { code: '"";\n', filename: getPrettierRcJsFilename('double-quote') },
    // Override .prettierrc from object option.
    {
      code: `var foo = {bar: 0};\n`,
      filename: getPrettierRcJsFilename('bracket-spacing'),
      options: [{ bracketSpacing: false }],
    },
    // Only use options from plugin, skipping .prettierrc
    {
      code: `var foo = {bar: 0};\n`,
      filename: getPrettierRcJsFilename('bracket-spacing'),
      options: [{ bracketSpacing: false }, { usePrettierrc: false }],
    },
    // Ignores filenames in .prettierignore
    {
      code: `("");\n`,
      filename: getPrettierRcJsFilename('single-quote', 'ignore-me.js'),
    },
    // Sets a default parser when it can't be inferred from the file extensions
    {
      code: `('');\n`,
      filename: getPrettierRcJsFilename('single-quote', 'dummy.qqq'),
    },
    // Overwrites the parser for file extensions prettier would try to format
    // with not the babylon parser
    // In the real world, eslint-plugin-markdown would transform file contents
    // into JS snippets that would get passed to ESLint
    {
      code: `('');\n`,
      filename: getPrettierRcJsFilename('single-quote', 'dummy.md'),
    },
    // Should ignore files from node_modules
    {
      code: 'a();;;;;;\n',
      filename: 'node_modules/dummy.js',
    },
  ],
  invalid: [
    '01',
    '02',
    '03',
    '04',
    '05',
    '06',
    '07',
    '08',
    '09',
    '10',
    '11-a',
    '11-b',
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
  ].map((name) => loadInvalidFixture(name)),
});

const vueRuleTester = new RuleTester({
  parser: require.resolve('vue-eslint-parser'),
});

vueRuleTester.run('vue', rule, {
  valid: [
    {
      code: `<template>\n  <div>HI</div>\n</template>\n<script>\n3;\n</script>\n`,
      filename: 'valid.vue',
    },
  ],
  invalid: [
    Object.assign(loadInvalidFixture('vue'), {
      filename: 'invalid.vue',
    }),
    Object.assign(loadInvalidFixture('vue-syntax-error'), {
      filename: 'syntax-error.vue',
    }),
  ],
});

const atGraphqlEslintRuleTester = new RuleTester({
  parser: require.resolve('@graphql-eslint/eslint-plugin'),
});

atGraphqlEslintRuleTester.run('@graphql-eslint/eslint-plugin', rule, {
  valid: [
    {
      code: `type Query {\n  foo: String!\n}\n`,
      filename: 'valid.graphql',
    },
  ],
  invalid: [
    Object.assign(loadInvalidFixture('graphql'), {
      filename: 'invalid.graphql',
    }),
  ],
});

// eslint-plugin-graphql handles literal graphql files by transforming graphql
// code with a processor, instead of using a parser. Unfortunately we cant
// specify custom processors in a RuleTester, so instead we have write test code
// that is the result of eslint-plugin-graphql's processing - this is the
// ESLintPluginGraphQLFile tagged template literal. See
// https://github.com/apollographql/eslint-plugin-graphql/blob/c465fedc8fea239ee1731ad4ec3ee1183a3cdddf/src/index.js#L404
// In the future if ESLint supports processors (https://github.com/eslint/rfcs/pull/31)
// we should be define a RuleTester like
// `newRuleTester({processor: require('eslint-plugin-graphql').processor['.graphql']})
// and then pass in pure graphql into the code value.
const eslintPluginGraphqlRuleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 'latest',
  },
});

eslintPluginGraphqlRuleTester.run('eslint-plugin-graphql', rule, {
  valid: [
    {
      code: 'ESLintPluginGraphQLFile`type Query {\n  foo: String!\n}`\n',
      filename: getPrettierRcJsFilename('no-semi', 'dummy.graphql'),
    },
  ],
  invalid: [],
});

const mdxRuleTester = new RuleTester({
  parser: require.resolve('eslint-mdx'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
  },
});

mdxRuleTester.run('eslint-plugin-mdx', rule, {
  valid: [
    {
      code: [
        "import React from 'react';",
        '',
        '<div>Hello World</div>',
        '',
      ].join('\n'),
      filename: 'valid.mdx',
    },
  ],
  invalid: [
    Object.assign(loadInvalidFixture('mdx'), {
      filename: 'invalid.mdx',
    }),
  ],
});

runFixture('*.mdx', [
  [
    {
      column: 33,
      endColumn: 33,
      endLine: 1,
      fix: {
        range: [32, 32],
        text: ';',
      },
      line: 1,
      message: 'Insert `;`',
      messageId: 'insert',
      nodeType: null,
      ruleId: 'prettier/prettier',
      severity: 2,
    },
    {
      column: 27,
      endColumn: 27,
      endLine: 6,
      fix: {
        range: [91, 91],
        text: ';',
      },
      line: 6,
      message: 'Insert `;`',
      messageId: 'insert',
      nodeType: null,
      ruleId: 'prettier/prettier',
      severity: 2,
    },
  ],
]);

// Testing 'forceFormatExtracted' option
// (should only format code block, not the whole file)
runFixture('*.md', [
  [
    {
      column: 17,
      endColumn: 26,
      endLine: 3,
      fix: {
        range: [32, 41],
        text: "'example';",
      },
      line: 3,
      message: 'Replace `"example"` with `\'example\';`',
      messageId: 'replace',
      nodeType: null,
      ruleId: 'prettier/prettier',
      severity: 2,
    },
  ],
]);

runFixture(
  'eslint-plugin-svelte/*.svelte',
  [
    [
      {
        column: 5,
        endColumn: 11,
        endLine: 2,
        fix: {
          range: [13, 19],
          text: 'name',
        },
        line: 2,
        message: 'Replace `·name·` with `name`',
        messageId: 'replace',
        nodeType: null,
        ruleId: 'prettier/prettier',
        severity: 2,
      },
      {
        column: 4,
        endColumn: 20,
        endLine: 5,
        fix: {
          range: [45, 61],
          text: '>Hello {name',
        },
        line: 5,
        message: 'Replace `·>·Hello·{·name·` with `>Hello·{name`',
        messageId: 'replace',
        nodeType: null,
        ruleId: 'prettier/prettier',
        severity: 2,
      },
    ],
  ],
  // FIXME: https://github.com/sveltejs/prettier-plugin-svelte/issues/317
  true,
);

runFixture(
  'eslint-plugin-svelte3/*.svelte',
  [[], []],
  // FIXME: https://github.com/sveltejs/prettier-plugin-svelte/issues/317
  true,
);

// ------------------------------------------------------------------------------
//  Helpers
// ------------------------------------------------------------------------------

/**
 * Reads a fixture file and returns an "invalid" case for use by RuleTester.
 * The fixture format aims to reduce the pain of debugging offsets by keeping
 * the lines and columns of the test code as close to what the rule will report
 * as possible.
 *
 * @param {string} name - Fixture basename.
 * @returns {object} A {code, output, options, errors} test object.
 */
function loadInvalidFixture(name) {
  const filename = path.join(__dirname, 'invalid', name + '.txt');
  const src = fs.readFileSync(filename, 'utf8');
  const sections = src.split(/^[A-Z]+:\n/m).map((x) => x.replace(/\n$/, ''));
  const item = {
    code: sections[1],
    output: sections[2],
    options: eval(sections[3]), // eslint-disable-line no-eval
    errors: eval(sections[4]), // eslint-disable-line no-eval
    filename: getPrettierRcJsFilename('double-quote', name + '.txt'),
  };
  if (sections.length >= 6) {
    item.filename = sections[5];
  }
  return item;
}

/**
 * Builds a dummy javascript file path to trick prettier into resolving a specific .prettierrc file.
 *
 * @param {string} dir - Prettierrc fixture basename.
 * @param {string} file
 * @returns {string} A javascript filename relative to the .prettierrc config.
 */
function getPrettierRcJsFilename(dir, file = 'dummy.js') {
  return path.resolve(__dirname, `./prettierrc/${dir}/${file}`);
}

/**
 *
 * @param {string} pattern
 * @param {import('eslint').Linter.LintMessage[][]} asserts
 * @param {boolean} [skip]
 * @returns {Promise<void>}
 */
async function runFixture(pattern, asserts, skip) {
  if (skip) {
    return;
  }
  try {
    const results = await eslint.lintFiles([`test/fixtures/${pattern}`]);
    return assert.deepStrictEqual(
      results.map(({ messages }) => messages),
      asserts,
    );
  } catch (err) {
    console.error(err);
    // eslint-disable-next-line n/no-process-exit -- the fix is not correctly working
    process.exit(1);
  }
}
