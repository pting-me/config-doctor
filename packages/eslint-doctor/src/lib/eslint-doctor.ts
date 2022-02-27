import { Linter } from 'eslint';
import { loadConfig } from './load-config';

const main = async (fileDirectory = './') => {
  console.log('\nESLint Doctor\n\n');

  const issues: string[] = [];

  const getConfigFromFile = async (fileDirectory = './') => {
    const config = await loadConfig(fileDirectory);

    if (!config) {
      throw new Error('Unable to parse ESLint config.');
    }

    return config;
  };

  const checkPrefixesThenRemove = (extensions: string[]) => {
    const removePrefix = (extensions: string) => {
      const matches = extensions.match(/^eslint-config-(.+)/);
      if (matches && matches[1]) {
        issues.push(
          `Extension "${matches[0]}" can be renamed to "${matches[1]}"\n\n`
        );
        // TODO: add autofix
        return matches[1];
      }
      return extensions;
    };

    return extensions.map(removePrefix);
  };

  const checkStyleExtensions = (extensions: string[]) => {
    const styleExtensions = ['airbnb', 'standard', 'google', 'xo'];

    const usedStyleExtensions = extensions.filter((extension) => {
      return styleExtensions.includes(extension);
    });

    if (usedStyleExtensions.length > 1) {
      let message =
        'There are too many style enforcing extensions.\n' +
        'We recommend only using one of the following:\n';
      usedStyleExtensions.forEach((extensions) => {
        message += `* ${extensions}\n`;
      });
      message += '\n';
      issues.push(message);
    }
  };

  const checkPrettierIsLast = (extensions: string[]) => {
    const hasPrettier = extensions.includes('prettier');
    if (hasPrettier) {
      const prettierIsLast = extensions[extensions.length - 1] === 'prettier';
      if (!prettierIsLast) {
        issues.push('The Prettier extension should always be placed last.\n\n');
        // TODO: add autofix
      }
    }
  };

  const checkTsIsAfterRecommended = (extensions: string[]) => {
    const recommendedIndex = extensions.indexOf('eslint:recommended');
    const tsExtensions = [
      'plugin:@typescript-eslint/all',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ];

    if (recommendedIndex !== -1) {
      tsExtensions.forEach((extension) => {
        // if recommended comes after current extension
        if (
          extensions.indexOf(extension) > -1 &&
          recommendedIndex > extensions.indexOf(extension)
        ) {
          issues.push(
            `'${extension}' is supposed to come after 'eslint:recommended'`
          );
        }
      });
    }
  };

  const checkExtensions = (config: Linter.Config) => {
    // TODO: check overrides

    // only need to check 'extends' if it's an array
    if (!(config.extends && typeof config.extends === 'object')) {
      return;
    }

    // Check: 'eslint-config-' prefix is unnecessary
    const parsedExtensions = checkPrefixesThenRemove(config.extends);

    // Check: config should not have more than one style enforcing extension
    checkStyleExtensions(parsedExtensions);

    // Check: 'prettier' extension must be last in extension list
    checkPrettierIsLast(parsedExtensions);

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
    checkTsIsAfterRecommended(parsedExtensions);
  };

  const config = await getConfigFromFile(fileDirectory);
  checkExtensions(config);

  issues.forEach((issue) => {
    console.log(issue);
  });

  console.log(`${issues.length} issues found.`);
};

export { main };
