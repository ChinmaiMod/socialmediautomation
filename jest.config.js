/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: '<rootDir>/tsconfig.jest.json',
    }],
  },
  collectCoverageFrom: [
    'lib/**/*.{ts,tsx}',
    '!lib/__mocks__/**',
    '!lib/AuthProvider.tsx', // Excluded: JSX parsing issues without babel
    '!lib/ai/claude.ts', // Excluded: Requires actual Anthropic SDK
    '!lib/db.ts', // Excluded: Requires real Supabase connection
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = config;
