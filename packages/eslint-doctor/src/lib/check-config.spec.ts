import {
  checkPrefixesThenRemove,
  checkPrettierIsLast,
  checkStyleExtensions,
  checkTsAll,
  checkTsIsAfterRecommended,
  checkTsResetExtension,
} from './check-config';

describe('eslint-doctor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should detect extra prefixes', () => {
    const control = ['airbnb', 'prettier'];
    const variable = ['eslint-config-airbnb', 'eslint-config-prettier'];

    const { parsedExtensions: controlParsedExtensions, issues: controlIssues } =
      checkPrefixesThenRemove(control);
    expect(controlIssues.length).toBe(0);
    expect(controlParsedExtensions).toStrictEqual(control);

    const { parsedExtensions, issues } = checkPrefixesThenRemove(variable);
    expect(issues.length).toBe(2);
    expect(parsedExtensions).toStrictEqual(control);
  });

  it('should detect conflicting style extensions', () => {
    const control = ['airbnb'];
    const variable = ['airbnb', 'google'];

    const controlIssues = checkStyleExtensions(control);
    expect(controlIssues.length).toBe(0);

    const issues = checkStyleExtensions(variable);
    expect(issues.length).toBe(1);
  });

  it('should detect when prettier is not in last position', () => {
    const control = ['eslint:recommended', 'prettier'];
    const variable = ['prettier', 'eslint:recommended'];

    const controlIssues = checkStyleExtensions(control);
    expect(controlIssues.length).toBe(0);

    const issues = checkPrettierIsLast(variable);
    expect(issues.length).toBe(1);
  });

  it('should warn when @typescript-eslint/all is used', () => {
    const control: string[] = [];
    const variable = ['plugin:@typescript-eslint/all'];

    const controlIssues = checkTsAll(control);
    expect(controlIssues.length).toBe(0);

    const issues = checkTsAll(variable);
    expect(issues.length).toBe(1);
  });

  it('should detect when ts extensions are after eslint-recommended', () => {
    const control = [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ];
    const variable = [
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
      'eslint:recommended',
    ];

    const controlIssues = checkTsIsAfterRecommended(control);
    expect(controlIssues.length).toBe(0);

    const issues = checkTsIsAfterRecommended(variable);
    expect(issues.length).toBe(3);
  });

  it("should warn when ts version >= 3.0.0 and doesn't need extra eslint-recommended reset", () => {
    const packageJson = {
      devDependencies: { '@typescript-eslint/eslint-plugin': '5.0.0' },
    };

    const control = [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ];
    const variable = [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/recommended-requiring-type-checking',
    ];

    const controlIssues = checkTsResetExtension(control, packageJson);
    expect(controlIssues.length).toBe(0);

    const issues = checkTsResetExtension(variable, packageJson);
    expect(issues.length).toBe(1);
  });

  it('should warn when ts version < 3.0.0 and @typescript-eslint/eslint-recommended comes after other ts extensions', () => {
    const packageJson = {
      devDependencies: { '@typescript-eslint/eslint-plugin': '2.0.0' },
    };

    const control = [
      'eslint:recommended',
      'plugin:@typescript-eslint/eslint-recommended',
      'plugin:@typescript-eslint/recommended',
    ];
    const variable = [
      'eslint:recommended',
      'plugin:@typescript-eslint/recommended',
      'plugin:@typescript-eslint/eslint-recommended',
    ];

    const controlIssues = checkTsResetExtension(control, packageJson);
    expect(controlIssues.length).toBe(0);

    const issues = checkTsResetExtension(variable, packageJson);
    expect(issues.length).toBe(1);
  });
});
