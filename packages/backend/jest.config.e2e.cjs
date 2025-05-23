/*
* For a detailed explanation regarding each configuration property and type check, visit:
* https://jestjs.io/docs/en/configuration.html
*/

const base = require('./jest.config.cjs')

module.exports = {
	...base,
	globalSetup: "<rootDir>/test-server/entry.mjs",
	setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
	testMatch: [
		"<rootDir>/test/e2e/**/*.ts",
	],
};
