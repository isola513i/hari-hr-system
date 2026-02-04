"use strict";
// Jest test setup file
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
    // Clean up any resources
    jest.clearAllMocks();
}));
