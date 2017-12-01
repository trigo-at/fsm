'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const bb = require('bluebird');
const FSM = require('./fsm');
const { expect } = require('chai');

describe('FSM', () => {
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
					didChangeState: null,
					willSaveState: null,
					didSaveState: null,
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
					didChangeState: 'didChangeState',
					willSaveState: 'willSaveState',
					didSaveState: 'didSaveState',
					saveState: 'saveState',
				},
			});
			expect(ts[0].args).to.eql([42, 'test']);
		});

		it('with "execute(trasnition)" calls transition methods with "ctx" and args', async () => {
			fsm = new FSM(cfg);
			await fsm.execute('trans', 42, 'test');
			expect(ts[0].ctx).to.eql({
				from: 'a',
				to: 'b',
				transition: 'trans',
				fsm,
				data,
				results: {
					willChangeState: 'willChangeState',
					beforeTrans: 'beforeTrans',
					didChangeState: 'didChangeState',
					willSaveState: 'willSaveState',
					didSaveState: 'didSaveState',
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
			expect(ts[2].name).to.equal('didChangeState');
			expect(ts[3].name).to.equal('willSaveState');
			expect(ts[4].name).to.equal('didSaveState');
			expect(ts[5].name).to.equal('afterTrans');
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
			expect(ts[2].name).to.equal('didChangeState');
			expect(ts[3].name).to.equal('willSaveState');
			expect(ts[4].name).to.equal('didSaveState');
			expect(ts.length).to.equal(5);
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
