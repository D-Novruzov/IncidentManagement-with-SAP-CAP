module.exports = {
  testEnvironment: 'node',
  testTimeout: 60000,
  testMatch: ['**/test/**/*.test.js'],
  collectCoverageFrom: ['srv/**/*.js'],
  coveragePathIgnorePatterns: ['/node_modules/']
};