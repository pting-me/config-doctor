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
import { access, readFile } from 'fs/promises';
import path from 'path';
import importFresh from 'import-fresh';
import stripComments from 'strip-json-comments';
import debugOrig from 'debug';
import { Linter } from 'eslint';

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
async function loadYAMLConfigFile(filePath: string): Promise<Linter.Config> {
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
async function loadJSONConfigFile(filePath: string) {
  debug(`Loading JSON config file: ${filePath}`);

  try {
    return JSON.parse(
      stripComments(await readFileWrapper(filePath))
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

  try {
    return (
      (yaml.load(
        stripComments(await readFileWrapper(filePath))
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
function loadJSConfigFile(filePath: string) {
  debug(`Loading JS config file: ${filePath}`);
  try {
    return importFresh<Linter.Config>(filePath);
  } catch (error) {
    const e = error as Error;
    debug(`Error reading JavaScript file: ${filePath}`);
    e.message = `Cannot read config file: ${filePath}\nError: ${e.message}`;
    throw e;
  }
}

/**
 * Loads a configuration from a package.json file.
 * @param {string} filePath The filename to load.
 * @returns {ConfigData} The configuration object from the file.
 * @throws {Error} If the file cannot be read.
 */
async function loadPackageJSONConfigFile(filePath: string) {
  debug(`Loading package.json config file: ${filePath}`);
  try {
    const packageData = JSON.parse(
      stripComments(await readFileWrapper(filePath))
    ) as Record<string, unknown>;

    if (!Object.hasOwnProperty.call(packageData, 'eslintConfig')) {
      throw Object.assign(
        new Error("package.json file doesn't have 'eslintConfig' field."),
        { code: 'ESLINT_CONFIG_FIELD_NOT_FOUND' }
      );
    }

    return packageData.eslintConfig as Linter.Config;
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
async function loadESLintIgnoreFile(filePath: string) {
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
      return loadJSConfigFile(filePath);

    case '.json':
      if (path.basename(filePath) === 'package.json') {
        return loadPackageJSONConfigFile(filePath);
      }
      return loadJSONConfigFile(filePath);

    case '.yaml':
    case '.yml':
      return loadYAMLConfigFile(filePath);

    default:
      return loadLegacyConfigFile(filePath);
  }
}

/**
 * Loads a configuration file based on the directory.
 * @param {string} fileDirectory The path to the directory of the configuration.
 * @returns {ConfigData} The configuration information.
 */
async function loadConfig(fileDirectory = './') {
  for (const filename of configFilenames) {
    try {
      await access(fileDirectory, constants.F_OK);
      return await loadConfigFile(fileDirectory + filename);
    } catch {
      /**
       * Ideally we shouldn't have to call access (per Node doc).
       *
       * However, every function would have to be broken apart
       * to differentiate between file not existing, and file
       * parsing errors.
       */
    }
  }
  throw new Error('Could not find any ESLint config');
}

export { loadConfig };
