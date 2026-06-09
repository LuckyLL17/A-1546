module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  coverageDirectory: '<rootDir>/coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/types/**',
    '!src/app.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'json-summary'],
  testTimeout: 10000,
  setupFilesAfterSetup: [],
};
