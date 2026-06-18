// Jest test setup file

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-minimum-32-chars';
// 64 hex chars (32 bytes) — required by src/utils/encryption.ts, which fails
// fast (process.exit) at import time if this is missing or malformed.
process.env.TOTP_ENCRYPTION_KEY =
  '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

// Mock the database module
jest.mock('../db', () => ({
  query: jest.fn(),
  default: {
    query: jest.fn(),
    end: jest.fn(),
  },
}));

// Increase timeout for async tests
jest.setTimeout(10000);

// Global afterAll to clean up
afterAll(async () => {
  // Clean up any resources
  jest.clearAllMocks();
});
