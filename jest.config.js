export default {
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@config/(.*)$': '<rootDir>/packages/config/$1',
    '^@services/(.*)$': '<rootDir>/packages/services/$1',
    '^@utils/(.*)$': '<rootDir>/packages/utils/$1',
    '^@logger$': '<rootDir>/packages/utils/logger',
    '^@logger.ts$': '<rootDir>/packages/utils/logger',
  },
  setupFilesAfterEnv: ['<rootDir>/apps/api/src/test/setup.ts'],
  testMatch: [
    '<rootDir>/apps/api/src/**/__tests__/**/*.test.ts',
    '<rootDir>/apps/api/src/**/*.test.ts'
  ],
  collectCoverageFrom: [
    'apps/api/src/**/*.ts',
    '!apps/api/src/**/*.d.ts',
    '!apps/api/src/test/**',
    '!apps/api/prisma/**'
  ],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
    }],
  },
};