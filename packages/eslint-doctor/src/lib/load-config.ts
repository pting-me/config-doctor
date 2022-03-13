/**
 * This file was originally adopted from @eslint/eslintrc
 *
 * https://github.com/eslint/eslintrc/blob/8761efbb1b263f63bcc34a3765ce092c7494b251/lib/config-array-factory.js
 *
 * ESLint uses the @eslint/eslintrc to read and interpret configuration
 * files. However, at the moment we are only interested in mimicking
 * the file extraction functions.
 */

//------------------------------------------------------------------------------
// Requirements
//------------------------------------------------------------------------------

import { constants } from 'fs';
import { access, readFile, realpath } from 'fs/promises';
import path from 'path';
import importFresh from 'import-fresh';
import debugOrig from 'debug';

import type { Linter } from 'eslint';
import type { PackageJson as BasePackageJson } from 'type-fest';

type PackageJson = BasePackageJson & {
  eslintConfig?: Linter.Config;
};

const debug = debugOrig('eslint-doctor:load-config');

//------------------------------------------------------------------------------
// Helpers
//------------------------------------------------------------------------------

const configFilenames = [
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
  '.eslintrc',
  'package.json',
];

async function importStripJsonComments() {
  const { default: stripJsonComments } = await (eval(
    'import("strip-json-comments")'
  ) as Promise<typeof import('strip-json-comments')>);
  return stripJsonComments;
}

/**
 * Check if a given string is a file path.
 * @param {string} nameOrPath A module name or file path.
 * @returns {boolean} `true` if the `nameOrPath` is a file path.
 */
// Not sure if we will use this, but may be necessary later for file checking
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isFilePath(nameOrPath: string) {
  return /^\.{1,2}[/\\]/u.test(nameOrPath) || path.isAbsolute(nameOrPath);
}

/**
 * Convenience wrapper for synchronously reading file contents.
 * @param {string} filePath The filename to read.
 * @returns {string} The file contents, with the BOM removed.
 */
async function readFileWrapper(filePath: string) {
  return (await readFile(filePath, { encoding: 'utf8' })).replace(
    /^\ufeff/u,
    ''
  );
}

/**
 * Loads a YAML configuration from a file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadYamlConfigFile(filePath: string): Promise<Linter.Config> {
  debug(`Loading YAML config file: ${filePath}`);

  // lazy load YAML to improve performance when not used
  const yaml = await import('js-yaml');

  try {
    // empty YAML file can be null, so always use
    return (yaml.load(await readFileWrapper(filePath)) as Linter.Config) || {};
  } catch (error) {
    const e = error as Error;
    debug(`Error reading YAML file: ${filePath}`);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a JSON configuration from a file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadJsonConfigFile(filePath: string) {
  debug(`Loading JSON config file: ${filePath}`);
  const stripJsonComments = await importStripJsonComments();

  try {
    return JSON.parse(
      stripJsonComments(await readFileWrapper(filePath))
    ) as Linter.Config;
  } catch (error) {
    const e = error as Error;
    debug(`Error reading JSON file: ${filePath}`);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a legacy (.eslintrc) configuration from a file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadLegacyConfigFile(filePath: string) {
  debug(`Loading legacy config file: ${filePath}`);

  // lazy load YAML to improve performance when not used
  const yaml = await import('js-yaml');
  const stripJsonComments = await importStripJsonComments();

  try {
    return (
      (yaml.load(
        stripJsonComments(await readFileWrapper(filePath))
      ) as Linter.Config) || /* istanbul ignore next */ {}
    );
  } catch (error) {
    const e = error as Error;
    debug('Error reading YAML file: %s\n%o', filePath, e);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a JavaScript configuration from a file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadJsConfigFile(filePath: string) {
  debug(`Loading JS config file: ${filePath}`);

  try {
    /**
     * We have to import JS using node. We can't use the original
     *   logic as if we were loading a YAML or JSON file because 'import'
     *   interprets relative paths relative to the binary file
     *   location, not the location we execute the code.
     *   We have to use absolute paths.
     */

    const realFilePath = await realpath(filePath);

    // Import as module from absolute path
    debug(`Importing file: ${realFilePath}`);
    const config = importFresh<Linter.Config>(realFilePath);

    return config;
  } catch (error) {
    const e = error as Error;
    debug(`Error reading JavaScript file: ${filePath}`);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;

    throw e;
  }
}

/**
 * Loads a package.json file
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadPackageJsonFile(filePath: string) {
  debug(`Loading package.json file: ${filePath}`);
  const stripJsonComments = await importStripJsonComments();

  try {
    const packageData = JSON.parse(
      stripJsonComments(await readFileWrapper(filePath))
    ) as PackageJson;

    return packageData;
  } catch (error) {
    const e = error as Error;
    debug(`Error reading package.json file: ${filePath}`);
    e.message = `Cannot read package.json file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a configuration from a package.json file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadPackageJsonConfigFile(filePath: string) {
  try {
    const packageData = await loadPackageJsonFile(filePath);

    if (!packageData.eslintConfig) {
      throw Object.assign(
        new Error("package.json file doesn't have 'eslintConfig' field."),
        { code: 'ESLINT_CONFIG_FIELD_NOT_FOUND' }
      );
    }

    return packageData.eslintConfig;
  } catch (error) {
    const e = error as Error;
    debug(`Error reading package.json file: ${filePath}`);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a `.eslintignore` from a file.
 * @param {string} filePath The filename to load.
 * @returns {string[]} The ignore patterns from the file.
 */
// Will be used to check eslintignore files at a later time
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadEslintIgnoreFile(filePath: string) {
  debug(`Loading .eslintignore file: ${filePath}`);

  try {
    return (await readFileWrapper(filePath))
      .split(/\r?\n/gu)
      .filter((line) => line.trim() !== '' && !line.startsWith('#'));
  } catch (error) {
    const e = error as Error;
    debug(`Error reading .eslintignore file: ${filePath}`);
    e.message = `Cannot read .eslintignore file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a configuration file regardless of the source. Inspects the file path
 * to determine the correctly way to load the config file.
 * @param {string} filePath The path to the configuration.
 * @returns {ConfigData|null} The configuration information.
 */
function loadConfigFile(filePath: string) {
  switch (path.extname(filePath)) {
    case '.js':
    case '.cjs':
      return loadJsConfigFile(filePath);

    case '.json':
      if (path.basename(filePath) === 'package.json') {
        return loadPackageJsonConfigFile(filePath);
      }
      return loadJsonConfigFile(filePath);

    case '.yaml':
    case '.yml':
      return loadYamlConfigFile(filePath);

    default:
      return loadLegacyConfigFile(filePath);
  }
}

/**
 * Loads a configuration file based on the directory.
 * @param {string} fileDirectory The path to the directory of the configuration.
 * @returns {ConfigData} The configuration information.
 */
async function loadConfigDirectory(fileDirectory = './') {
  for (const filename of configFilenames) {
    try {
      await access(fileDirectory, constants.F_OK);
      return await loadConfigFile(fileDirectory + filename);
    } catch (error) {
      /**
       * Ideally we shouldn't have to call access (per Node doc).
       *
       * However, every function would have to be broken apart
       * to differentiate between file not existing, and file
       * parsing errors.
       */
      const e = error as Error;
      debug(e.message);
    }
  }
  /**
   * Only throw after every file fails.
   */
  throw new Error('Could not find any ESLint config');
}

export {
  loadConfigDirectory,
  loadJsConfigFile,
  loadJsonConfigFile,
  loadLegacyConfigFile,
  loadPackageJsonConfigFile,
  loadPackageJsonFile,
  loadYamlConfigFile,
  PackageJson,
};
