'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const validateTransition = require('./validate-transition');
const { expect } = require('chai');

describe('validateTransition', () => {
	['__uninitialized__', '', '  ', null, undefined].forEach((name) => {
		it(`does not allow trasition name: "${name}"`, () => {
			expect(() => validateTransition({ name, from: 'a', to: 'b' })).to.throw();
		});
	});
	['__uninitialized__', '', '  ', null, undefined].forEach((name) => {
		it(`does not allow from state: "${name}"`, () => {
			expect(() => validateTransition({ name: 'trans', from: name, to: 'b' })).to.throw();
		});
		it(`does not allow from state: "['a', ${name}, 'b']"`, () => {
			expect(() => validateTransition({ name: 'trans', from: ['a', name, 'b'], to: 'b' })).to.throw(/Invalid transition from:/);
		});
		it(`does not allow to state: "${name}"`, () => {
			expect(() => validateTransition({ name: 'trans', from: 'a', to: name })).to.throw();
		});
	});
});
