import { checkConfig } from './check-config';

describe.skip('eslint-doctor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should run without failure', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory = testDirectory + '../../fixtures/load-config/';
    await checkConfig(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('0 issues found.');
  });

  it('should detect extra prefixes', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory =
      testDirectory + '../../fixtures/extension/prefixes/';
    await checkConfig(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('2 issues found.');
  });

  it('should detect conflicting style extensions', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory =
      testDirectory + '../../fixtures/extension/style-extensions/';
    await checkConfig(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('1 issues found.');
  });

  it('should detect prettier not last', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory =
      testDirectory + '../../fixtures/extension/prettier-last/';
    await checkConfig(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('1 issues found.');
  });

  it('should detect ts extension after recommended', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory =
      testDirectory + '../../fixtures/extension/ts-after/';
    await checkConfig(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('1 issues found.');
  });

});
