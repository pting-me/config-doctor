import {
  loadConfigDirectory,
  loadJsConfigFile,
  loadJsonConfigFile,
  loadLegacyConfigFile,
  loadPackageJsonConfigFile,
  loadYamlConfigFile,
} from './load-config';
import { Linter } from 'eslint';

describe('load-config', () => {
  const testDirectory = expect
    .getState()
    .testPath.replace(/(.+)\/([^/]+)/, '$1/');
  const fixturesDirectory = testDirectory + '../../fixtures/load-config/all-config-files';

  const getOverride = (config: Linter.Config<Linter.RulesRecord>) => {
    // type assertion - since we know the test will fail if it's undefined
    const override = config?.overrides?.[0] as Linter.ConfigOverride<Linter.RulesRecord>;
    expect(override).not.toBeUndefined();
    return override;
  };

  it('should run without failure', async () => {
    await loadConfigDirectory(fixturesDirectory);
  });

  it('loadJsConfigFile', async () => {
    const configJsPath = fixturesDirectory + '.eslintrc.js';
    const configJs = await loadJsConfigFile(configJsPath);
    const overrideJs = getOverride(configJs);
    expect(overrideJs.excludedFiles?.[0]).toBe('.eslintrc.js');

    const configCjsPath = fixturesDirectory + '.eslintrc.cjs';
    const configCjs = await loadJsConfigFile(configCjsPath);
    const overrideCjs = getOverride(configCjs);
    expect(overrideCjs.excludedFiles?.[0]).toBe('.eslintrc.cjs');
  });

  it('loadYamlConfigFile', async () => {
    const configYamlPath = fixturesDirectory + '.eslintrc.yaml';
    const configYaml = await loadYamlConfigFile(configYamlPath);
    const overrideYaml = getOverride(configYaml);
    expect(overrideYaml.excludedFiles?.[0]).toBe('.eslintrc.yaml');

    const configYmlPath = fixturesDirectory + '.eslintrc.yml';
    const configYml = await loadYamlConfigFile(configYmlPath);
    const overrideYml = getOverride(configYml);
    expect(overrideYml.excludedFiles?.[0]).toBe('.eslintrc.yml');
  });

  it('loadJsonConfigFile', async () => {
    const configPath = fixturesDirectory + '.eslintrc.json';
    const config = await loadJsonConfigFile(configPath);
    const override = getOverride(config);
    expect(override.excludedFiles?.[0]).toBe('.eslintrc.json');
  });

  it('loadLegacyConfigFile', async () => {
    const configPath = fixturesDirectory + '.eslintrc';
    const config = await loadLegacyConfigFile(configPath);
    const override = getOverride(config);
    expect(override.excludedFiles?.[0]).toBe('.eslintrc');
  });

  it('loadPackageJsonConfigFile', async () => {
    const configPath = fixturesDirectory + 'package.json';
    const config = await loadPackageJsonConfigFile(configPath);
    const override = getOverride(config);
    expect(override.excludedFiles?.[0]).toBe('package.json');
  });

  it('js file should have highest priority', async () => {
    const config = await loadConfigDirectory(fixturesDirectory);
    const override = getOverride(config);
    expect(override.excludedFiles?.[0]).toBe('.eslintrc.js');
  });
});
