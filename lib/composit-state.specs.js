'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const CompositState = require('./composit-state');
const { expect } = require('chai');

describe('compositState', () => {
	describe('compositState.build({ ... })', () => {
		it('single state string', () => {
			expect(CompositState.build({ event: 'draft' })).to.equal('event:draft');
		});
		it('multi state string', () => {
			expect(CompositState.build({ event: 'draft', hotel: 'requested', venue: 'reserved' })).to.equal('event:draft|hotel:requested|venue:reserved');
		});
	});

	describe('compositState.parse(str)', () => {
		it('converts to object', () => {
			expect(CompositState.parse('event:draft|hotel:requested|venue:reserved')).to.eql({ event: 'draft', hotel: 'requested', venue: 'reserved' });
		});
	});
});
