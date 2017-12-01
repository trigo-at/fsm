'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const FSM = require('./fsm');
const { expect } = require('chai');

describe('FSM', () => {
	describe('fluent build API', () => {
		it('can add transition', async () => {
			const f = new FSM({});
			f.addTransition({ name: 'trans', from: 'a', to: 'b' })
				.addTransition({ name: 'trans2', from: ['a', 'b'], to: 'c' })
				.init('a');
			await f.trans();
			expect(f.state).to.equal('b');
			await f.trans2();
			expect(f.state).to.equal('c');
		});

		it('can add transition array', async () => {
			const f = new FSM({});
			f.addTransition([{ name: 'trans', from: 'a', to: 'b' },
				{ name: 'trans2', from: ['a', 'b'], to: 'c' }])
				.init('a');

			await f.trans();
			expect(f.state).to.equal('b');
			await f.trans2();
			expect(f.state).to.equal('c');
		});
		it('validates transitions', () => {
			const f = new FSM({});
			expect(() => f.addTransition({})).to.throw(/Invalid transition/);
		});

		it('does not allow trasition name clashes', () => {
			const f = new FSM({});
			f.addTransition({ name: 'a-to-b', from: 'a', to: 'b' });
			expect(() => f.addTransition({ name: 'a:to:b', from: 'a', to: 'b' })).to.throw(/Ambigious transtion name/);
		});

		it('does not allow transiion named like native FSM methods', () => {
			const f = new FSM({});
			expect(() => f.addTransition({ name: 'execute', from: 'a', to: 'b' })).to.throw(/Forbidden transition name/);
			expect(() => f.addTransition({ name: 'add:transition', from: 'a', to: 'b' })).to.throw(/Forbidden transition name/);
		});
	});
});
