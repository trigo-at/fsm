'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const addToArray = require('./add-to-array');
const { expect } = require('chai');

describe('addToArray', () => {
	it('adds element to the array', () => {
		const a = [];
		addToArray(a, 'a');
		expect(a).to.eql(['a']);
	});
	it('does not add duplicates', () => {
		const a = [];
		addToArray(a, 'a');
		addToArray(a, 'a');
		expect(a).to.eql(['a']);
	});
});
