import { gte, minVersion } from 'semver';
import {
  loadConfigDirectory,
  loadPackageJsonFile,
  PackageJson,
} from './load-config';

/**
 * Gets the dependency version range by checking all possible areas it can be
 * in the `package.json` object.
 * @param {PackageJson} packageJson the object containing all data extracted from the `package.json` file
 * @param {string} packageName name of the package
 * @returns {string} the version range in valid npm semver format
 */
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
 * Checks for unnecessary `eslint-config-` prefix.
 * Also parses out the correct extension name.
 * @param {string[]} extensions array of extension names
 * @returns {{parsedExtensions: string[], issues: string[]}}
 *   object containing `parsedExtensions`, the parsed array of the `extensions`
 *   input, and `issues` as the array of issues to display
 */
const checkPrefixesThenRemove = (extensions: string[]) => {
  const issues: string[] = [];
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

  return {
    parsedExtensions: extensions.map(removePrefix),
    issues,
  };
};

/**
 * Checks for conflicting style enforcing extensions.
 * @param {string[]} extensions array of extension names
 * @returns {string[]} array of issues to display
 */
const checkStyleExtensions = (extensions: string[]) => {
  const issues: string[] = [];
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
  return issues;
};

/**
 * Checks that `prettier` extension appears last.
 * @param {string[]} extensions array of extension names
 * @returns {string[]} array of issues to display
 */
const checkPrettierIsLast = (extensions: string[]) => {
  const issues: string[] = [];
  const hasPrettier = extensions.includes('prettier');
  if (hasPrettier) {
    const prettierIsLast = extensions[extensions.length - 1] === 'prettier';
    if (!prettierIsLast) {
      issues.push('The Prettier extension should always be placed last.\n\n');
      // TODO: add autofix
    }
  }
  return issues;
};

/**
 * Checks for `@typescript-eslint/all`, which is not recommended.
 * @param {string[]} extensions array of extension names
 * @returns {string[]} array of issues to display
 */
const checkTsAll = (extensions: string[]) => {
  const issues = [];
  if (extensions.includes('plugin:@typescript-eslint/all')) {
    issues.push(
      'The extension @typescript-eslint/all is not recommended. Use @typescript-eslint/recommended instead.'
    );
  }
  return issues;
};

/**
 * Checks that all `@typescript-eslint` extensions come after `eslint:recommended`.
 * @param {string[]} extensions array of extension names
 * @returns {string[]} array of issues to display
 */
const checkTsIsAfterRecommended = (extensions: string[]) => {
  const recommendedIndex = extensions.indexOf('eslint:recommended');
  const tsExtensions = [
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ];

  const issues: string[] = [];
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
  return issues;
};

/**
 * Check @typescript-eslint/eslint-recommended, which is an extension that
 * resets the eslint-recommended rules for use by the @typescript-eslint plugin.
 * If @typescript-eslint version >= 3.0.0, it will ask user to remove if another
 * @typescript-eslint extension has been included.
 * For other versions, check that it's before any other @typescript-eslint extension.
 * @param {string[]} extensions array of extension names
 * @param {PackageJson} packageJson object containing `package.json` data
 * @returns {string[]} array of issues to display
 */
const checkTsResetExtension = (
  extensions: string[],
  packageJson: PackageJson
) => {
  const issues: string[] = [];
  const hasTsEslintRecommended = extensions.includes(
    'plugin:@typescript-eslint/eslint-recommended'
  );
  if (!hasTsEslintRecommended) {
    return issues;
  }

  const range = getDependencyVersionRange(
    packageJson,
    '@typescript-eslint/eslint-plugin'
  );
  const version = range && minVersion(range);
  if (!version) {
    return issues;
  }

  const tsExtensions = [
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
  ];

  if (
    gte(version, '3.0.0') &&
    extensions.reduce((allIncludes, extension) => {
      return allIncludes || tsExtensions.includes(extension);
    }, false)
  ) {
    // version >= 3.0.0 includes eslint-recommended in other extensions
    issues.push(
      '@typescript-eslint/eslint-recommended is loaded in all other @typescript-eslint extensions'
    );
    // TODO: add autofix
  } else {
    // version < 3.0.0 needs to have eslint-recommended before other extensions
    const recommendedIndex = extensions.indexOf(
      'plugin:@typescript-eslint/eslint-recommended'
    );

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
          // TODO: add autofix
        }
      });
    }
  }
  return issues;
};

/**
 * Main function to run all checks.
 * @param fileDirectory the directory to read config from
 * @returns {Promise<void>}
 */
const checkConfig = async (fileDirectory = './') => {
  console.log('\nESLint Doctor\n\n');

  const packageJson = await loadPackageJsonFile(`${fileDirectory}package.json`);
  const config =
    packageJson.eslintConfig ?? (await loadConfigDirectory(fileDirectory));

  // TODO: check overrides

  // don't check 'extends' if it's undefined
  if (!config?.extends) {
    return;
  }

  const configExtends =
    typeof config.extends === 'string' ? [config.extends] : config.extends;

  const { parsedExtensions, issues } = checkPrefixesThenRemove(configExtends);
  issues.push(...checkStyleExtensions(parsedExtensions));
  issues.push(...checkPrettierIsLast(parsedExtensions));
  issues.push(...checkTsAll(parsedExtensions));
  issues.push(...checkTsResetExtension(parsedExtensions, packageJson));
  issues.push(...checkTsIsAfterRecommended(parsedExtensions));

  // Check: @typescript-eslint plugins should all have the same version
  // TODO: implement
  // TODO: add autofix

  issues.forEach((issue) => {
    console.log(issue);
  });

  console.log(`${issues.length} issues found.`);
};

export {
  checkConfig,
  checkPrefixesThenRemove,
  checkPrettierIsLast,
  checkStyleExtensions,
  checkTsAll,
  checkTsResetExtension,
  checkTsIsAfterRecommended,
};
