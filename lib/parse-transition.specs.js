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

	describe('state object notation', () => {
		it('converts state objects to string representation', () => {
			expect(parseTrasition({ name: 'trans', from: { a: 'b', c: 'd' }, to: 'b' })).to.eql([
			{ name: 'trans', from: 'a:b|c:d', to: 'b' },
			]);
		});

		it('"to" in object notation patches "from" state object', () => {
			expect(parseTrasition(
				{ name: 'trans', from: { a: 'b', c: 'd' }, to: { a: 'x' } })).to.eql([
				{ name: 'trans', from: 'a:b|c:d', to: 'a:x|c:d' },
				]);
		});
		it('"to" in object notation replaces "from" in string notation', () => {
			expect(parseTrasition(
				{ name: 'trans', from: 'a:b|c:d', to: { a: 'x' } })).to.eql([
				{ name: 'trans', from: 'a:b|c:d', to: 'a:x' },
				]);
		});

		it('can use arrays in "from" clause values to create state permutations', () => {
			expect(parseTrasition(
				{ name: 'trans', from: { k1: ['k1_v1', 'k1_v2', 'k1_v3'], k2: 'k2_v1', k3: ['k3_v1', 'k3_v2'] }, to: 'x' })).to.eql([
				{ name: 'trans', from: 'k1:k1_v1|k2:k2_v1|k3:k3_v1', to: 'x' },
				{ name: 'trans', from: 'k1:k1_v1|k2:k2_v1|k3:k3_v2', to: 'x' },
				{ name: 'trans', from: 'k1:k1_v2|k2:k2_v1|k3:k3_v1', to: 'x' },
				{ name: 'trans', from: 'k1:k1_v2|k2:k2_v1|k3:k3_v2', to: 'x' },
				{ name: 'trans', from: 'k1:k1_v3|k2:k2_v1|k3:k3_v1', to: 'x' },
				{ name: 'trans', from: 'k1:k1_v3|k2:k2_v1|k3:k3_v2', to: 'x' },
				]);
		});
	});

	it('expand array from clause to multiple transitins', () => {
		expect(parseTrasition({ name: 'trans', from: ['a', 'b'], to: 'b' })).to.eql([
			{ name: 'trans', from: 'a', to: 'b' },
			{ name: 'trans', from: 'b', to: 'b' },
		]);
	});
});
