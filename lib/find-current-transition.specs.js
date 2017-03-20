'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const findCurrentTransition = require('./find-current-transition');
const { expect } = require('chai');

const t = { name: 'method:name', from: 'x', to: 'b' };
const t1 = { name: 'method:name', from: 'a', to: 'b' };
const t2 = { name: 'method:name', from: ['b', 'c'], to: 'b' };
const tConflict = { name: 'method:name', from: 'c', to: 'b' };

describe('findCurrentTransition', () => {
	it('returns matching tarnsiton using toCacemCase', () => {
		expect(findCurrentTransition('methodName', 'a', [t, t1, t2])).to.eql(t1);
	});

	it('works with arrayed to', () => {
		expect(findCurrentTransition('methodName', 'b', [t, t1, t2])).to.eql(t2);
	});

	it('throws with abigious transtitins', () => {
		expect(() => findCurrentTransition('methodName', 'c', [t, t1, t2, tConflict])).to.throw(/Ambigious transitions found/);
	});
});
