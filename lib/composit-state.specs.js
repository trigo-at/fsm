'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, arrow-body-style: 0 */

const compositState = require('./composit-state');
const { expect } = require('chai');

describe('compositState', () => {
	describe('compositState.build({ ... })', () => {
		it('single state string', () => {
			expect(compositState.build({ event: 'draft' })).to.equal('event:draft');
		});
		it('multi state string', () => {
			expect(compositState.build({ event: 'draft', hotel: 'requested', venue: 'reserved' })).to.equal('event:draft|hotel:requested|venue:reserved');
		});
	});

	describe('compositState.parse(str)', () => {
		it('converts to object', () => {
			expect(compositState.parse('event:draft|hotel:requested|venue:reserved')).to.eql({ event: 'draft', hotel: 'requested', venue: 'reserved' });
		});
	});

	describe('compositState(state).get(key)', () => {
		it('returns value', () => {
			expect(compositState('event:draft|hotel:requested|venue:reserved').get('event')).to.equal('draft');
		});

		it('throw with invalud key', () => {
			expect(() => compositState('event:draft|hotel:requested|venue:reserved').get('neddo')).to.throw;
		});
	});

	describe('compositState(state).set(key, value)', () => {
		it('returns value', () => {
			expect(compositState('event:draft|hotel:requested|venue:reserved').set('event', 'planning')).to.equal('event:planning|hotel:requested|venue:reserved');
		});
		it('throw with invalud key', () => {
			expect(() => compositState('event:draft|hotel:requested|venue:reserved').set('neddo', 'value')).to.throw;
		});
	});
});
