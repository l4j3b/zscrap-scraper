module.exports = {
  testEnvironment: "node",
  // roots: ['<rootDir>/test'],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["./jest.setup.js"],
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
};
