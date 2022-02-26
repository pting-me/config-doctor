import { main } from './eslint-doctor';

describe('eslint-doctor', () => {
  it('should run without failure', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    const testDirectory = expect
      .getState()
      .testPath.replace(/(.+)\/([^/]+)/, '$1/');
    const testCasesDirectory = testDirectory + '../../fixtures/file-type/';
    await main(testCasesDirectory);
    expect(consoleSpy).toHaveBeenCalledWith('0 issues found.');
  });
});
