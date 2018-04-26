'use strict';

/* eslint-env node, mocha */
/* eslint no-unused-expressions: 0, one-var-declaration-per-line: 0, one-var: 0, no-empty: 0  */

const bb = require('bluebird');
const FSM = require('./fsm');
const { expect } = require('chai');

describe('FSM', () => {
	describe('transition REST API', () => {
		const data = {
			resId: '42',
			_embedded: {
				event: {
					resId: '22',
				},
			},
		};

		let fsm, cfg;
		let savedContext;
		beforeEach(() => {
			savedContext = null;
			cfg = {
				initialState: 'a',
				transitions: [{
					name: 't1',
					from: '*',
					to: 'a',
					api: {
						path: '/entity/trans',
						method: 'patch',
					},
				}, {
					name: 't2',
					from: '*',
					to: 'a',
					api: {
						path: '/entity/{resId}/trans/{subId}',
						method: 'patch',
						params: {
							resId: 'data.resId',
							subId: 'data._embedded.event.resId',
						},
					},
				}, {
					name: 't3',
					from: '*',
					to: 'a',
				}, {
					name: 't4',
					from: '*',
					to: 'a',
					api: {
						path: '/{entity}/{resId}/trans/{subId}',
						method: 'patch',
						params: {
							resId: 'data.resId',
							subId: 'data._embedded.event.resId',
						},
					},
				}, {
					name: 't5',
					from: '*',
					to: 'a',
					api: {
						path: '/entity/trans',
						method: 'patch',
					},
					rules: [
						() => {},
						() => {},
					],
				}, {
					name: 't6',
					from: '*',
					to: 'a',
					api: {
						path: '/entity/trans',
						method: 'patch',
					},
					rules: [
						() => {},
						() => { throw new Error('some error'); },
					],
				}, {
					name: 't7',
					from: '*',
					to: 'a',
					api: {
						path: '/entity/trans',
						method: 'patch',
					},
					rules: [
						(ctx) => { savedContext = ctx; },
					],
				}],
				saveState: () => {},
				willChangeState: () => bb.delay(5),
				data,
			};
		});

		it('exposes "restApi()" function', async () => {
			fsm = new FSM(cfg);
			expect(fsm.restApi).to.be.a('function');
		});

		it('filters transitions without "api" property', async () => {
			fsm = new FSM(cfg);
			const r = fsm.restApi();
			expect(r.t1).to.exist;
			expect(r.t2).to.exist;
			expect(r.t3).not.to.exist;
		});

		it('returns parsed api object', async () => {
			fsm = new FSM(cfg);
			const r = fsm.restApi();
			expect(r.t1).to.eql({
				href: '/entity/trans',
				method: 'patch',
			});
		});

		it('returns "self" when declared', async () => {
			fsm = new FSM(Object.assign({}, cfg, {
				api: {
					self: {
						path: '/entity/{resId}',
					},
					params: {
						resId: 'data.resId',
					},
				},
			}));
			const r = fsm.restApi();
			expect(r.self).to.eql({
				href: '/entity/42',
				method: 'get',
			});
		});

		it('can mix global & transition local params in same route', () => {
			fsm = new FSM(Object.assign({}, cfg, {
				api: {
					data: {
						entity: 'events',
					},
					self: {
						path: '/{entity}/{resId}',
					},
					params: {
						entity: 'api.data.entity',
						resId: 'data.resId',
					},
				},
			}));

			const r = fsm.restApi();
			expect(r.t4).to.eql({
				href: '/events/42/trans/22',
				method: 'patch',
			});
		});


		it('can declare static params data in "api.data" object', () => {
			fsm = new FSM(Object.assign({}, cfg, {
				api: {
					data: {
						entity: 'events',
					},
					self: {
						path: '/{entity}/{resId}',
					},
					params: {
						entity: 'api.data.entity',
						resId: 'data.resId',
					},
				},
			}));

			const r = fsm.restApi();
			expect(r.self).to.eql({
				href: '/events/42',
				method: 'get',
			});
		});

		it('should return the restApi object if all rules are satisfied', async () => {
			fsm = new FSM(cfg);
			const r = fsm.restApi();
			expect(r.t5).to.eql({
				href: '/entity/trans',
				method: 'patch',
			});
		});

		it('should return a restApi object with a error message if not all rules are satisfied', async () => {
			fsm = new FSM(cfg);
			const r = fsm.restApi();
			expect(r.t6).to.eql({
				href: '/entity/trans',
				method: 'patch',
				error: {
					message: 'some error',
				},
			});
		});

		it('should pass the context of the fsm to the rules functions', async () => {
			fsm = new FSM(cfg);
			fsm.restApi();
			expect(savedContext.data).to.eql(data);
		});

		it('should execute the rules functions on an fsm without a data object without any error', async () => {
			const testCfg = {
				initialState: 'a',
				transitions: [
					{
						name: 't',
						from: '*',
						to: 'a',
						api: {
							path: '/entity/trans',
							method: 'patch',
						},
						rules: [
							(ctx) => { savedContext = ctx; },
						],
					},
				],
				saveState: () => {},
				willChangeState: () => bb.delay(5),
			};

			fsm = new FSM(testCfg);
			const r = fsm.restApi();
			expect(savedContext.data).to.be.undefined;
			expect(r.t).to.eql({
				href: '/entity/trans',
				method: 'patch',
			});
		});
	});
});
