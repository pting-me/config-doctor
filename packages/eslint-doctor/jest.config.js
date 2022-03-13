module.exports = {
  displayName: 'eslint-doctor',
  preset: '../../jest.preset.js',
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.spec.json',
    },
  },
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]sx?$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  coverageDirectory: '../../coverage/packages/eslint-doctor',
};

// This is necessary to enable importStripJsonComments
process.env.NODE_OPTIONS = '--experimental-vm-modules';
