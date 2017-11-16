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
			expect(() => parseTrasition({ name: 'trans', from: ['a', name, 'b'], to: 'b' })).to.throw();
		});
		it(`does not allow to state: "${name}"`, () => {
			expect(() => parseTrasition({ name: 'trans', from: 'a', to: name })).to.throw();
		});
	});

	it('state values must match regex: /^([a-zA-Z0-9-_.#\\/@\\$%^!=<>+~?]+|\\*)$/', () => {
		expect(() => parseTrasition({ name: 't1', from: 'a:1', to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't2', from: 'a|1', to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't1', from: ['a:1'], to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't2', from: ['a|1'], to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't1', from: { s1: ['a:1'] }, to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't2', from: { s1: ['a|1'] }, to: 'a' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't1', from: 'a', to: 'a:1' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't2', from: 'a', to: 'a|1' })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't1', from: 'a', to: { s1: 'a:1' } })).to.throw(/Invalid state value!/);
		expect(() => parseTrasition({ name: 't2', from: 'a', to: { s1: 'a|1' } })).to.throw(/Invalid state value!/);
	});

	it('"to" can be a function', () => {
		parseTrasition({ name: 't', from: 'a', to: () => {} });
	});

	it('"to" substate can be a function', () => {
		parseTrasition({ name: 't', from: { s1: 'a', s2: 'b' }, to: { s1: 'a', s2: () => {} } });
	});
});
