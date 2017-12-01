'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const bb = require('bluebird');
const FSM = require('./fsm');
const { expect } = require('chai');

describe('FSM', () => {
	describe('ctor, API & state constrainsts', () => {
		let fsm;
		beforeEach(() => {
			fsm = new FSM({
				transitions: [
					{ name: 'a-to-b', from: 'a', to: 'b' },
					{ name: 'no:op', from: 'a', to: '*' },
					{ name: 'b-to-c', from: 'b', to: 'c' },
					{ name: 'a-to-c', from: 'a', to: 'c', rules: [() => { throw new Error('some error'); }] },
				],
			});
			fsm.init('a');
		});

		it('can create empty FSM', () => {
			new FSM({}); //eslint-disable-line
		});
		it('uninitialized: state == "__uninitialized__"', () => {
			expect(new FSM({ transitions: [] }).state).to.equal('__uninitialized__');
		});

		it('validates transitions', () => {
			expect(() => new FSM({ transitions: [{}] })).to.throw(/Invalid transition/);
		});
		it('init(state)', () => {
			fsm.init('a');
			expect(fsm.state).to.equal('a');
		});

		it('cannot set "state: property', () => {
			expect(() => {
				fsm.state = 'test';
			}).to.throw('cannot set state');
		});

		it('can access "data" obj', () => {
			const dataObj = { dat: 'a', onbj: { as: 'as' } };
			const f = new FSM({ data: dataObj });
			expect(f.data).to.equal(dataObj);
		});

		it('can set "data" obj', () => {
			const dataObj = { dat: 'a', onbj: { as: 'as' } };
			const f = new FSM({});
			f.data = dataObj;
			expect(f.data).to.equal(dataObj);
		});

		it('creates transition methods', () => {
			expect(fsm.aToB).to.be.instanceof(Function);
			expect(fsm.noOp).to.be.instanceof(Function);
			expect(fsm.bToC).to.be.instanceof(Function);
		});

		it('changes state when calling transition method', async () => {
			await fsm.aToB();
			expect(fsm.state).to.equal('b');
		});

		it('chances state using "execute(trasnition:name)"', async () => {
			await fsm.execute('a-to-b', { arg: 'obj' });
			expect(fsm.state).to.equal('b');
		});

		it('chances state using "execute(trasnitionName)"', async () => {
			await fsm.execute('aToB', { arg: 'obj' });
			expect(fsm.state).to.equal('b');
		});

		it('keeps state when "to" === "*"', async () => {
			await fsm.noOp();
			expect(fsm.state).to.equal('a');
		});

		it('can list valid transitions', async () => {
			expect(fsm.transitions()).to.eql(['a-to-b', 'no:op', 'a-to-c']);
		});

		it('can list all transitions', async () => {
			const transitions = fsm.allTransitions();
			const transitionNames = transitions.map(t => t.name);
			const expectedTransitions = ['a-to-b', 'no:op', 'b-to-c', 'a-to-c'];
			expect(transitions.length).to.eql(4);
			expect(transitionNames).to.eql(expectedTransitions);
		});

		it('cannot run invalid transition', async () => {
			let error;
			try {
				await fsm.bToC();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('Invalid transition: "bToC" in state: "a"');
		});

		it('cannot run valid transition if rules are not satisfied', async () => {
			let error;
			try {
				await fsm.aToC();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.inner.message).to.equal('some error');
			expect(error.message).to.equal('Invalid transition: "aToC". Reason: some error');
		});

		it('can use array in from clause', async () => {
			fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1', from: ['a', 'b', 'c'], to: 'd' },
				],
			});

			await fsm.trans1();
			fsm.init('b');
			await fsm.trans1();
			fsm.init('c');
			await fsm.trans1();
			let error;
			try {
				await fsm.trans1();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('Invalid transition: "trans1" in state: "d"');
		});
	});


	describe('"to" state functions', () => {
		it('can set to: async () => newState', async () => {
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1', from: 'a', to: async () => 'b' },
				],
			});

			await fsm.trans1();
			expect(fsm.state).to.equal('b');
		});
		it('it awaits the async function', async () => {
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1',
						from: 'a',
						to: async () => {
							await bb.delay(10);
							return 'b';
						} },
				],
			});

			await fsm.trans1();
			expect(fsm.state).to.equal('b');
		});

		it('aborts transition & throws error whe function throws', async () => {
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1',
						from: 'a',
						to: async () => { throw new Error('asf'); } },
				],
			});

			let thrown = false;
			try {
				await fsm.trans1();
			} catch (e) {
				thrown = true;
			}
			expect(thrown).to.be.true;
			expect(fsm.state).to.equal('a');
		});

		it('validates the functions resukt to a valid state string', async () => {
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1',
						from: 'a',
						to: async () => '' },
				],
			});

			let err;
			try {
				await fsm.trans1();
			} catch (e) {
				err = e;
			}
			expect(err.message).to.contain('not a valid state string');
		});

		it('passes the state value as first argument to "to" function', async () => {
			let stateArg;
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1',
						from: 'a',
						to: async (state) => {
							stateArg = state;
							state = 'asgsdg'; // eslint-disable-line
							return 'b';
						} },

				],
			});

			await fsm.trans1();
			expect(stateArg).to.equal('a');
		});

		it('passes the ctx object as second argument to "to" function', async () => {
			let ctxArg;
			const fsm = new FSM({
				initialState: 'a',
				transitions: [
					{ name: 'trans1',
						from: 'a',
						to: async (state, ctx) => {
							ctxArg = ctx;
							return 'b';
						} },

				],
				data: {
					as: 'sa',
				},
			});

			await fsm.trans1();
			expect(ctxArg.fsm).to.equal(fsm);
			expect(ctxArg.data).to.equal(fsm.data);
		});

		it('works on state object properties', async () => {
			let ctxArg, stateArg;
			const fsm = new FSM({
				initialState: FSM.compositState.build({ s1: 's1', s2: 's2' }),
				transitions: [
					{ name: 'trans1',
						from: { s1: 's1', s2: 's2' },
						to: { s1: async (state, ctx) => {
							stateArg = state;
							ctxArg = ctx;
							return 'b';
						} } },
				],
				data: {
					as: 'sa',
				},
			});

			await fsm.trans1();
			expect(stateArg).to.equal('s1');
			expect(ctxArg.fsm).to.equal(fsm);
			expect(ctxArg.data).to.equal(fsm.data);
			expect(FSM.compositState.parse(fsm.state)).to.eql({ s1: 'b', s2: 's2' });
		});
	});

	describe('can use state Objects (compositState)', () => {
		it('to in object notation patches from stat', async () => {
			const f = new FSM({
				initialState: 'ns1:def|ns2:fe',
				transitions: [
					{ name: 't1', from: { ns1: 'def', ns2: 'fe' }, to: { ns1: 'b' } },
				],
			});
			// expect(f.states()).to.eql(['ns1:def|ns2:fe', 'ns1:b|ns2:fe'].sort());
			await f.t1();
			expect(f.state).to.equal('ns1:b|ns2:fe');
		});

		it('creates state permutation with object notation', async () => {
			const f = new FSM({
				initialState: 'k1:k11|k2:k21',
				transitions: [
					{ name: 't1', from: { k1: ['k11', 'k12'], k2: ['k21', 'k22'] }, to: '*' },
				],
			});

			f.init('k1:k11|k2:k21');
			await f.t1();
			expect(f.state).to.equal('k1:k11|k2:k21');
			f.init('k1:k12|k2:k21');
			await f.t1();
			expect(f.state).to.equal('k1:k12|k2:k21');
			f.init('k1:k11|k2:k22');
			await f.t1();
			expect(f.state).to.equal('k1:k11|k2:k22');
			f.init('k1:k12|k2:k22');
			await f.t1();
			expect(f.state).to.equal('k1:k12|k2:k22');
		});
	});

	describe('large machine', () => {
		const transitions = [];
		const cntSubstate = 100;
		const cntValue = 100;
		const cntTransiotions = 100;
		before(() => {
			const state = {};
			for (let i = 0; i < cntSubstate; i++) {
				state[`substate_${i}`] = [];
				for (let j = 0; j < cntValue; j++) {
					state[`substate_${i}`].push(`value_${i}_${j}`);
				}
			}
			for (let t = 0; t < cntTransiotions; t++) {
				transitions.push({
					name: `trans:${t}`,
					from: state,
					to: '*',
				});
			}
		});
		it('initialize large FSM', async () => {
			const d1 = new Date();
			const test = new FSM({ transitions });
			const d2 = new Date();
			const ms = d2.getTime() - d1.getTime();
			expect(ms).to.lt(1000);
			expect(test).to.exist;
		});
	});
});
