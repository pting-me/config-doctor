import {
  checkPrefixesThenRemove,
  checkPrettierIsLast,
  checkStyleExtensions,
  checkTsIsAfterRecommended,
} from './check-config';

describe('eslint-doctor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect extra prefixes', () => {
    const { parsedExtensions, issues } = checkPrefixesThenRemove([
      'eslint-config-airbnb',
      'eslint-config-prettier',
    ]);

    expect(issues.length).toBe(2);
    expect(parsedExtensions).toStrictEqual(['airbnb', 'prettier']);
  });

  it('should detect conflicting style extensions', () => {
    const issues = checkStyleExtensions(['airbnb', 'google']);
    expect(issues.length).toBe(1);
  });

  it('should detect prettier not last', () => {
    const issues = checkPrettierIsLast(['prettier', 'eslint:recommended']);
    expect(issues.length).toBe(1);
  });

  it('should detect ts extension after recommended', () => {
    const issues = checkTsIsAfterRecommended([
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'eslint:recommended',
    ]);
    expect(issues.length).toBe(3);
  });
});
