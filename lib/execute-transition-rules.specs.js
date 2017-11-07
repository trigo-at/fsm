'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const executeTransitionRules = require('./execute-transition-rules');

describe('execute-transition-rules', () => {
	it('should return undefined if the transitionRules are not set', async () => {
		const result = executeTransitionRules(undefined, {});
		expect(result).to.be.undefined;
	});

	it('should return undefined if the transitionRules are a empty array', async () => {
		const result = executeTransitionRules([], {});
		expect(result).to.be.undefined;
	});

	it('should return undefined if the transitionRules are a satisfied', async () => {
		const rules = [
			() => {},
			() => {},
			() => {},
		];

		const result = executeTransitionRules(rules, {});
		expect(result).to.be.undefined;
	});

	it('should return a error-string if the transitionRules are not satisfied', async () => {
		const rules = [
			() => {},
			() => { throw new Error('some error'); },
			() => {},
		];

		const result = executeTransitionRules(rules, {});
		expect(result.message).to.equal('some error');
	});
});
