// Jest test setup file

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
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
