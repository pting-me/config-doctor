import { main } from './eslint-doctor';

describe('eslint-doctor', () => {
  it('should run without failure', async () => {
    const consoleSpy = jest.spyOn(console, 'log');

    await main();
    expect(consoleSpy).toHaveBeenCalledWith('0 issues found.');
  });
});
