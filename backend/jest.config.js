export default {
    testEnvironment: 'node',
    transform: {},
    testMatch: ['**/__tests__/**/*.test.js'],
    verbose: true,
    injectGlobals: true,
    maxWorkers: 1,
    setupFiles: ['./jest.setup.js'],
};
