'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0 */

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
			expect(() => fsm.init('rya')).to.throw();
		});

		it('cannot set "state: property', () => {
			expect(() => {
				fsm.state = 'test';
			}).to.throw('cannot set state');
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
				init: 'a',
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
				init: 'a',
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: async (ctx) => {
					await bb.delay(100);
					saved = ctx.fsm.state;
				},
			});
			await fsm.trans();
			expect(saved).to.equal('b');
		});
		it('can use sync "saveState"', async () => {
			let ctx, args;
			const fsm = new FSM({
				init: 'a',
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
			});
			expect(args).to.eql([42, 'test']);
		});

		it('throw when exection is throw in sync "saveState"', async () => {
			let error;
			try {
				const fsm = new FSM({
					init: 'a',
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
					init: 'a',
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
				init: 'a',
				data,
				transitions: [{ name: 'trans', from: 'a', to: 'b' }],
				saveState: () => 'saveState',
				willChangeState: async (ctx, a1, a2) => {
					await bb.delay(50);
					ts.push({ name: 'willChangeState', ctx, args: [a1, a2] });
					return 'willChangeState';
				},
				didChangeState: async (ctx, ...args) => {
					await bb.delay(50);
					ts.push({ name: 'didChangeState', ctx, args });
					return 'didChangeState';
				},
				willSaveState: async (ctx, ...args) => {
					await bb.delay(50);
					ts.push({ name: 'willSaveState', ctx, args });
					return 'willSaveState';
				},
				didSaveState: async (ctx, ...args) => {
					await bb.delay(50);
					ts.push({ name: 'didSaveState', ctx, args });
					return 'didSaveState';
				},
				eventHandler: {
					beforeTrans: async (ctx, ...args) => {
						await bb.delay(50);
						ts.push({ name: 'beforeTrans', ctx, args });
						return 'beforeTrans';
					},
					afterTrans: async (ctx, ...args) => {
						await bb.delay(50);
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
				await bb.delay(50);
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
				await bb.delay(50);
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
				init: 'a',
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
});