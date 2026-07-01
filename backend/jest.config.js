/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['src/utils/**/*.ts', 'src/services/**/*.ts'],
  coverageDirectory: 'coverage',
  clearMocks: true,
  verbose: true,
};
