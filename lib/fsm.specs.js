'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const bb = require('bluebird');

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

	describe('can use state Objects (compositState)', () => {
		it('can define state as object { namespace: "default", namespace2: "planning" }', () => {
			const f = new FSM({
				transitions: [
					{ name: 't1', from: { ns1: 'def', ns2: 'fe' }, to: 'b' },
					{ name: 't2', from: [{ ns1: 'd2', ns2: 'd3' }, { ns1: 'd3', ns2: 'd4' }], to: 'x' },
				],
			});

			expect(f.states()).to.eql(['ns1:def|ns2:fe', 'b', 'ns1:d2|ns2:d3', 'ns1:d3|ns2:d4', 'x'].sort());
		});

		it('to in object notation patches from stat', async () => {
			const f = new FSM({
				initialState: 'ns1:def|ns2:fe',
				transitions: [
					{ name: 't1', from: { ns1: 'def', ns2: 'fe' }, to: { ns1: 'b' } },
				],
			});
			expect(f.states()).to.eql(['ns1:def|ns2:fe', 'ns1:b|ns2:fe'].sort());
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

			expect(f.states()).to.eql([
				'k1:k11|k2:k21',
				'k1:k12|k2:k21',
				'k1:k11|k2:k22',
				'k1:k12|k2:k22',
			].sort());
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
		it('can add transitiona array', async () => {
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
	});
	describe('ctor, API & state constrainsts', () => {
		let fsm;
		beforeEach(() => {
			fsm = new FSM({
				transitions: [
					{ name: 'a-to-b', from: 'a', to: 'b' },
					{ name: 'no:op', from: 'a', to: '*' },
					{ name: 'b-to-c', from: 'b', to: 'c' }],
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

		it('init(state) - checks if valid state', () => {
			expect(() => fsm.init('rya')).to.throw(/Invlaid state: "rya" known states/);
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

		it('state cahnges with transition method', async () => {
			await fsm.aToB();
			expect(fsm.state).to.equal('b');
		});

		it('keeps state when "to" === "*"', async () => {
			await fsm.noOp();
			expect(fsm.state).to.equal('a');
		});

		it('can list valid transitions', async () => {
			expect(fsm.transitions()).to.eql(['a-to-b', 'no:op']);
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

		it('can list allStates', () => {
			expect(fsm.states()).to.eql(['a', 'b', 'c']);
		});
	});

	describe('transition definitions', () => {
		it('can use array in from clause', async () => {
			const fsm = new FSM({
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

	describe('saveState', () => {
		it('can use async "saveState"', async () => {
			let saved;
			const fsm = new FSM({
				initialState: 'a',
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: async (ctx) => {
					await bb.delay(5);
					saved = ctx.fsm.state;
				},
			});
			await fsm.trans();
			expect(saved).to.equal('b');
		});
		it('can use sync "saveState"', async () => {
			let ctx, args;
			const fsm = new FSM({
				initialState: 'a',
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: (c, a) => {
					ctx = c;
					args = a;
				},
			});
			await fsm.trans(42, 'test');
			expect(ctx).to.eql({
				from: 'a',
				to: 'b',
				transition: 'trans',
				fsm,
				results: {
					willChangeState: null,
					beforeTrans: null,
					afterTrans: null,
					didChangeState: null,
					willSaveState: null,
					saveState: undefined,
				},
			});
			expect(args).to.eql([42, 'test']);
		});

		it('throw when exection is throw in sync "saveState"', async () => {
			let error;
			try {
				const fsm = new FSM({
					initialState: 'a',
					transitions: [{ name: 'trans', from: 'a', to: 'b' }],
					saveState: () => {
						throw new Error('save failed');
					},
				});
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('save failed');
		});
		it('throw when exection is throw in async "saveState"', async () => {
			let error;
			try {
				const fsm = new FSM({
					initialState: 'a',
					transitions: [{ name: 'trans', from: 'a', to: 'b' }],
					saveState: async () => {
						await bb.delay(20);
						throw new Error('save failed');
					},
				});
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('save failed');
		});
	});

	describe('transiton events', () => {
		let fsm, cfg, ts;
		const data = { test: 'data' };
		beforeEach(() => {
			ts = [];
			cfg = {
				initialState: 'a',
				data,
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: () => 'saveState',
				willChangeState: async (ctx, a1, a2) => {
					await bb.delay(5);
					ts.push({ name: 'willChangeState', ctx, args: [a1, a2] });
					return 'willChangeState';
				},
				didChangeState: async (ctx, ...args) => {
					await bb.delay(5);
					ts.push({ name: 'didChangeState', ctx, args });
					return 'didChangeState';
				},
				willSaveState: async (ctx, ...args) => {
					await bb.delay(5);
					ts.push({ name: 'willSaveState', ctx, args });
					return 'willSaveState';
				},
				didSaveState: async (ctx, ...args) => {
					await bb.delay(5);
					ts.push({ name: 'didSaveState', ctx, args });
					return 'didSaveState';
				},
				eventHandler: {
					beforeTrans: async (ctx, ...args) => {
						await bb.delay(5);
						ts.push({ name: 'beforeTrans', ctx, args });
						return 'beforeTrans';
					},
					afterTrans: async (ctx, ...args) => {
						await bb.delay(5);
						ts.push({ name: 'afterTrans', ctx, args });
						return 'afterTrans';
					},
				},
			};
		});

		it('calls transition methods with "ctx" and args', async () => {
			fsm = new FSM(cfg);
			await fsm.trans(42, 'test');
			expect(ts[0].ctx).to.eql({
				from: 'a',
				to: 'b',
				transition: 'trans',
				fsm,
				data,
				results: {
					willChangeState: 'willChangeState',
					beforeTrans: 'beforeTrans',
					afterTrans: 'afterTrans',
					didChangeState: 'didChangeState',
					willSaveState: 'willSaveState',
					saveState: 'saveState',
				},
			});
			expect(ts[0].args).to.eql([42, 'test']);
		});

		it('calls transition events in order', async () => {
			fsm = new FSM(cfg);
			await fsm.trans();
			expect(ts[0].name).to.equal('willChangeState');
			expect(ts[1].name).to.equal('beforeTrans');
			expect(ts[2].name).to.equal('afterTrans');
			expect(ts[3].name).to.equal('didChangeState');
			expect(ts[4].name).to.equal('willSaveState');
			expect(ts[5].name).to.equal('didSaveState');
		});

		it('returns all transitionHanlder results', async () => {
			fsm = new FSM(cfg);
			const result = await fsm.trans();
			expect(result).to.eql({
				willChangeState: 'willChangeState',
				beforeTrans: 'beforeTrans',
				afterTrans: 'afterTrans',
				didChangeState: 'didChangeState',
				willSaveState: 'willSaveState',
				saveState: 'saveState',
				didSaveState: 'didSaveState',
			});
		});

		it('throw error when beforeTransiton handler fails does not change state', async () => {
			cfg.eventHandler.beforeTrans = async () => {
				await bb.delay(5);
				throw new Error('derdo');
			};
			let error;
			try {
				fsm = new FSM(cfg);
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('derdo');
			expect(ts[0].name).to.equal('willChangeState');
			expect(ts.length).to.equal(1);
			expect(fsm.state).to.equal('a');
		});
		it('throw error when afterTransiton handler fails changes state', async () => {
			cfg.eventHandler.afterTrans = async () => {
				await bb.delay(5);
				throw new Error('derdo');
			};
			let error;
			try {
				fsm = new FSM(cfg);
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('derdo');
			expect(ts[0].name).to.equal('willChangeState');
			expect(ts[1].name).to.equal('beforeTrans');
			expect(ts.length).to.equal(2);
			expect(fsm.state).to.equal('b');
		});
	});

	describe('global transition events', () => {
		let fsm, cfg, ts;
		beforeEach(() => {
			ts = [];
			cfg = {
				initialState: 'a',
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: () => {},
				willChangeState: (ctx, ...args) => {
					ts.push({ name: 'willChangeState', ctx, args });
				},
				didChangeState: (ctx, ...args) => {
					ts.push({ name: 'didChangeState', ctx, args });
				},
				willSaveState: (ctx, ...args) => {
					ts.push({ name: 'willSaveState', ctx, args });
				},
				didSaveState: (ctx, ...args) => {
					ts.push({ name: 'didSaveState', ctx, args });
				},
			};
		});

		it('calls transition events in order', async () => {
			fsm = new FSM(cfg);
			await fsm.trans();
			expect(ts[0].name).to.equal('willChangeState');
			expect(ts[1].name).to.equal('didChangeState');
			expect(ts[2].name).to.equal('willSaveState');
			expect(ts[3].name).to.equal('didSaveState');
		});

		it('calls will & didSaveState only called when saveState is defined', async () => {
			delete cfg.saveState;
			fsm = new FSM(cfg);
			await fsm.trans();
			expect(ts[0].name).to.equal('willChangeState');
			expect(ts[1].name).to.equal('didChangeState');
			expect(ts.length).to.equal(2);
		});

		it('throw error when willChangeState & state does not change', async () => {
			cfg.willChangeState = () => {
				throw new Error('derdo');
			};
			let error;
			try {
				fsm = new FSM(cfg);
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('derdo');
			expect(fsm.state).to.equal('a');
		});
		it('throw error when didChangeState & state changes', async () => {
			cfg.didChangeState = () => {
				throw new Error('derdo');
			};
			let error;
			try {
				fsm = new FSM(cfg);
				await fsm.trans();
			} catch (e) {
				error = e;
			}
			expect(error).to.exist;
			expect(error.message).to.equal('derdo');
			expect(fsm.state).to.equal('b');
		});
	});

	describe('race conditions', () => {
		let fsm, cfg;
		beforeEach(() => {
			cfg = {
				initialState: 'a',
				transitions: [{ name: 'trans', from: ['a', 'b'], to: 'b' }, { name: 'trans2', from: ['a', 'b'], to: 'a' }],
				saveState: () => {},
				willChangeState: () => bb.delay(5),
			};
		});

		it('cannot start transition while anothr one is running', (done) => {
			fsm = new FSM(cfg);
			fsm.trans();
			fsm.trans2().then(() => done(new Error('should have failed'))).catch((err) => {
				expect(err.message).to.equal('Cannot start transition when during running transition');
				done();
			});
		});
		it('can run transition sequential', async () => {
			fsm = new FSM(cfg);
			await fsm.trans();
			await fsm.trans2();
		});

		it('can run transtition after a trasition was abourted', async () => {
			cfg.eventHandler = {
				beforeTrans: async () => {
					await bb.delay(5);
					throw new Error('uuppps');
				},
			};
			fsm = new FSM(cfg);
			try {
				await fsm.trans();
			} catch (e) {}
			await fsm.trans2();
		});
	});
});
