import { Linter } from 'eslint';
import { gte, minVersion } from 'semver';
import {
  loadConfigDirectory,
  loadPackageJsonFile,
  PackageJson,
} from './load-config';

const main = async (fileDirectory = './') => {
  console.log('\nESLint Doctor\n\n');

  const issues: string[] = [];

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

  const getDependencyVersionRange = (
    packageJson: PackageJson,
    packageName: string
  ) => {
    return (
      packageJson.dependencies?.[packageName] ||
      packageJson.devDependencies?.[packageName] ||
      packageJson.peerDependencies?.[packageName] ||
      packageJson.optionalDependencies?.[packageName]
    );
  };

  /**
   * Check @typescript-eslint/eslint-recommended.
   * If @typescript-eslint version >= 3.0.0, ask user to remove.
   * For other versions, check that it's after eslint-recommended
   * and before any other @typescript-eslint extension.
   * @param {string[]} extensions Array of ESLint extension names
   */
  const checkTsEslintRecommended = (
    extensions: string[],
    packageJson: PackageJson
  ) => {
    const hasTsEslintRecommended = extensions.includes(
      '@typescript-eslint/eslint-recommended'
    );
    if (!hasTsEslintRecommended) {
      return;
    }

    const range = getDependencyVersionRange(
      packageJson,
      '@typescript-eslint/eslint-plugin'
    );
    const version = range && minVersion(range);
    if (!version) {
      return;
    }

    if (gte(version, '3.0.0')) {
      // version >= 3.0.0 includes eslint-recommended in recommended
      issues.push(
        '@typescript-eslint/eslint-recommended is not necessary for version >= 3.0.0'
      );
    } else {
      // version < 3.0.0 needs to have eslint-recommended before other extensions
      const recommendedIndex = extensions.indexOf('plugin:@typescript-eslint/eslint-recommended');
      const tsExtensions = [
        'plugin:@typescript-eslint/all',
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
              `'${extension}' is supposed to come after '@typescript-eslint/eslint-recommended'`
            );
          }
        });
      }
    }
  };

  const checkExtensions = ({
    config,
    packageJson,
  }: {
    config: Linter.Config;
    packageJson: PackageJson;
  }) => {
    // TODO: check overrides

    // don't check 'extends' if it's undefined
    if (!config.extends) {
      return;
    }

    const configExtends =
      typeof config.extends === 'string' ? [config.extends] : config.extends;

    // Check: 'eslint-config-' prefix is unnecessary
    const parsedExtensions = checkPrefixesThenRemove(configExtends);

    // Check: config should not have more than one style enforcing extension
    checkStyleExtensions(parsedExtensions);

    // Check: 'prettier' extension must be last in extension list
    checkPrettierIsLast(parsedExtensions);

    checkTsEslintRecommended(parsedExtensions, packageJson);
    // TODO: add autofix

    // Check: @typescript-eslint plugins should all have the same version
    // TODO: implement
    // TODO: add autofix

    // Check: @typescript-eslint should always come after eslint:recommended
    checkTsIsAfterRecommended(parsedExtensions);
  };

  const packageJson = await loadPackageJsonFile(`${fileDirectory}package.json`);
  const config =
    packageJson.eslintConfig ?? (await loadConfigDirectory(fileDirectory));
  checkExtensions({ config, packageJson });

  issues.forEach((issue) => {
    console.log(issue);
  });

  console.log(`${issues.length} issues found.`);
};

export { main };
