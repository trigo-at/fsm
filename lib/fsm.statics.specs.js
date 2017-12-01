'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const FSM = require('./fsm');
const { expect } = require('chai');
const compositState = require('./composit-state');

describe('FSM', () => {
	describe('statics', () => {
		it('exposes compositState tool', () => {
			expect(FSM.compositState).to.equal(compositState);
		});

		it('cannot set compositState', () => {
			expect(() => { FSM.compositState = () => {}; }).to.throw();
		});

		it('exposes toFunctionName() helper', () => {
			expect(FSM.toFunctionName('test:transition:oida')).to.equal('testTransitionOida');
		});
	});
});
