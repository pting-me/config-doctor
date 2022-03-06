const { sample } = require('./sample');

module.exports = {
  overrides: [
    {
      files: ['*.js', '*.jsx'],
      excludedFiles: ['.eslintrc.cjs', sample],
    },
  ],
};
