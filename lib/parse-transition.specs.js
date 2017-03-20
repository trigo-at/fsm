'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const parseTrasition = require('./parse-transition');
const { expect } = require('chai');

describe('parseTransition', () => {
	['__uninitialized__', '', '  ', null, undefined].forEach((name) => {
		it(`does not allow trasition name: "${name}"`, () => {
			expect(() => parseTrasition({ name, from: 'a', to: 'b' })).to.throw();
		});
	});
	['__uninitialized__', '', '  ', null, undefined].forEach((name) => {
		it(`does not allow from state: "${name}"`, () => {
			expect(() => parseTrasition({ name: 'trans', from: name, to: 'b' })).to.throw();
		});
		it(`does not allow from state: "['a', ${name}, 'b']"`, () => {
			expect(() => parseTrasition({ name: 'trans', from: ['a', name, 'b'], to: 'b' })).to.throw(/Invalid transition from:/);
		});
		it(`does not allow to state: "${name}"`, () => {
			expect(() => parseTrasition({ name: 'trans', from: 'a', to: name })).to.throw();
		});
	});

	it('parses from: state objects', () => {
		expect(parseTrasition({ name: 'trans', from: { a: 'b', c: 'd' }, to: 'b' })).to.eql({
			name: 'trans', from: ['a:b|c:d'], to: 'b',
		});
	});
});
