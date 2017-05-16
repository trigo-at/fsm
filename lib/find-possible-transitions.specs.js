'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const { expect } = require('chai');
const findPossibleTransitions = require('./find-possible-transitions');

const tMatchAll = { name: 'tMatchAll', from: '*', to: '*' };
const tSingleString = { name: 'tSingleString', from: 'test', to: '*' };
const tMultiString = { name: 'tMultiString', from: ['test', 'test2'], to: '*' };
const tSingleObject = { name: 'tSingleObject', from: { k1: 'v1', k2: 'v2' }, to: '*' };
const tMultiObject = { name: 'tMultiObject', from: [{ k1: 'v1', k2: 'v2' }, { k1: 'v11', k2: 'v22' }], to: '*' };
const tSingleObjectMultiValue = { name: 'tSingleObjectMultiValue', from: { k1: ['v1', 'v111'], k2: ['v2', 'v222'] }, to: '*' };
const tMultiObjectMultiValue = { name: 'tMultiObjectMultiValue',
	from: [
		{ k1: ['v1', 'v111'], k2: ['v2', 'v222'] },
		{ k1: ['v1111', 'v11111'], k2: ['v2222', 'v22222'] },
	],
	to: '*' };

const allTrans = [
	tMatchAll,
	tSingleString,
	tMultiString,
	tSingleObject,
	tMultiObject,
	tSingleObjectMultiValue,
	tMultiObjectMultiValue,
];

describe('Match all transtion', () => {
	it('Match All: for state "asgasdg"', () => {
		const res = findPossibleTransitions('asgasdg', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.length).to.equal(1);
	});

	it('Match All: for state: "kk1:v1|kk2:v2"', () => {
		const res = findPossibleTransitions('kk1:v1|kk2:v2', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.length).to.equal(1);
	});

	it('Single String: for state "test"', () => {
		const res = findPossibleTransitions('test', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tSingleString')).to.exist;
		expect(res.find(t => t.name === 'tMultiString')).to.exist;
		expect(res.length).to.equal(3);
	});

	it('Multi String: for state "test2"', () => {
		const res = findPossibleTransitions('test2', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tMultiString')).to.exist;
		expect(res.length).to.equal(2);
	});

	it('Single Object: for state "k1:v1|k2:v2"', () => {
		const res = findPossibleTransitions('k1:v1|k2:v2', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tSingleObject')).to.exist;
		expect(res.find(t => t.name === 'tMultiObject')).to.exist;
		expect(res.find(t => t.name === 'tSingleObjectMultiValue')).to.exist;
		expect(res.find(t => t.name === 'tMultiObjectMultiValue')).to.exist;
		expect(res.length).to.equal(5);
	});

	it('Multi Object: for state "k1:v11|k2:v22"', () => {
		const res = findPossibleTransitions('k1:v11|k2:v22', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tMultiObject')).to.exist;
		expect(res.length).to.equal(2);
	});

	it('Single Object Multi Value: for state "k1:v111|k2:v222"', () => {
		const res = findPossibleTransitions('k1:v111|k2:v222', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tSingleObjectMultiValue')).to.exist;
		expect(res.find(t => t.name === 'tMultiObjectMultiValue')).to.exist;
		expect(res.length).to.equal(3);
	});

	it('Multi Object Multi Value: for state "k1:v11111|k2:v22222"', () => {
		const res = findPossibleTransitions('k1:v11111|k2:v22222', allTrans);
		expect(res.find(t => t.name === 'tMatchAll')).to.exist;
		expect(res.find(t => t.name === 'tMultiObjectMultiValue')).to.exist;
		expect(res.length).to.equal(2);
	});
});
