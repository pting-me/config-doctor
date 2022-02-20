import { Linter } from 'eslint';
import { loadConfig } from './load-config.js';

console.log('\nESLint Doctor\n\n');

const getConfigFromFile = async () => {
  const config = await loadConfig('./');

  if (!config) {
    throw new Error('Unable to parse ESLint config.');
  }

  return config;
};

const checkExtensions = (config: Linter.Config) => {
  // TODO: check overrides

  // only need to check 'extends' if it's an array
  if (!(config.extends && typeof config.extends === 'object')) {
    return;
  }

  // Check: 'eslint-config-' prefix is unnecessary

  const removePrefix = (extension: string) => {
    const matches = extension.match(/^eslint-config-(.+)/);
    if (matches && matches[1]) {
      console.log(
        `Extension "${matches[0]}" can be renamed to "${matches[1]}"`
      );
      // TODO: add autofix
      return matches[1];
    }
    return extension;
  };

  const parsedExtensions = config.extends.map(removePrefix);

  // Check: config should not have more than one style enforcing extension

  const styleExtensions = ['airbnb', 'standard', 'google', 'xo'];

  const usedStyleExtensions = parsedExtensions.filter((extension) => {
    return styleExtensions.includes(extension);
  });

  if (usedStyleExtensions.length > 1) {
    console.log('There are too many style enforcing extensions.');
    console.log('We recommend only using one of the following:');
    usedStyleExtensions.forEach((extension) => {
      console.log(`* ${extension}`);
    });
    console.log('');
  }

  // Check: 'prettier' extension must be last in extension list

  const hasPrettier = parsedExtensions.includes('prettier');
  if (hasPrettier) {
    const prettierIsLast =
      parsedExtensions[parsedExtensions.length - 1] === 'prettier';
    if (!prettierIsLast) {
      console.log('The Prettier extension should always be placed last.\n');
      // TODO: add autofix
    }
  }

  // TODO: load package.json

  // Check: @typescript-eslint/eslint-recommended is not required
  //   if @typescript-eslint version >= 3.0.0
  //   and there's another @typescript-eslint extension enabled
  // TODO: implement
  // TODO: add autofix

  // Check: @typescript-eslint plugins should all have the same version
  // TODO: implement
  // TODO: add autofix

  // Check: @typescript-eslint should always come after eslint:recommended

  const recommendedIndex = parsedExtensions.indexOf('eslint:recommended');
  const tsExtensions = [
    'plugin:@typescript-eslint/all',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ];

  if (recommendedIndex !== -1) {
    tsExtensions.forEach((extension) => {
      // if recommended comes after current extension
      if (recommendedIndex > parsedExtensions.indexOf(extension)) {
        console.log(
          `'${extension}' is supposed to come after 'eslint:recommended'`
        );
      }
    });
  }
};

const main = async () => {
  const config = await getConfigFromFile();
  checkExtensions(config);
};

main().catch(console.error);
