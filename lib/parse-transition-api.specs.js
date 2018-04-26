'use strict';

const parseApi = require('./parse-transition-api');
const { expect } = require('chai');

describe('parse transition api', () => {
	it('throws with missing "api"', () => {
		expect(() => parseApi({ })).to.throw('Argument "api" missing');
	});
	it('throws with missing "api.path"', () => {
		expect(() => parseApi({ api: { method: 'patch' } })).to.throw('Argument "api.path" missing');
	});


	it('returns corrct object', () => {
		const res = parseApi({ api: {
			path: '/test',
			method: 'patch',
		} });
		expect(res).to.eql({
			href: '/test',
			method: 'patch',
		});
	});

	it('resolves params from ctx object', () => {
		expect(parseApi({
			api: {
				path: '/test/{resId}',
				method: 'patch',
				params: {
					resId: 'data.event.resId',
				},
			},
			ctx: {
				data: {
					event: {
						resId: '42',
					},
				},
			},
		})).to.eql({
			href: '/test/42',
			method: 'patch',
		});
	});

	it('throws error when param cannot be resolved', () => {
		expect(() => parseApi({
			api: {
				path: '/test/{resId}',
				method: 'patch',
				params: {
					resId: 'data.event.resId',
				},
			},
			ctx: {
				data: {
					event: {
					},
				},
			},
		})).to.throw('Cannot resolve param: "resId" data path: "data.event.resId"');
	});

	it('creates "templates" object for unresolved path segments', () => {
		expect(parseApi({
			api: {
				path: '/test/{resId}/{eventId}/{seminarId}',
				method: 'patch',
				params: {
					resId: 'data.event.resId',
				},
			},
			ctx: {
				data: {
					event: {
						resId: '42',
					},
				},
			},
		})).to.eql({
			href: '/test/42/{eventId}/{seminarId}',
			method: 'patch',
			params: {
				eventId: true,
				seminarId: true,
			},
		});
	});

	it('returns a valid api object if the rule array is not satisfied', () => {
		const res = parseApi({
			api: {
				path: '/test',
				method: 'patch',
			},
			rules: [
				() => {},
				() => {},
			],
		});

		expect(res).to.eql({
			href: '/test',
			method: 'patch',
		});
	});

	it('returns a invalid api object if the rule array is not satisfied', () => {
		const res = parseApi({
			api: {
				path: '/test',
				method: 'patch',
			},
			rules: [
				() => {},
				() => { throw new Error('some error'); },
			],
		});

		expect(res).to.eql({
			href: '/test',
			method: 'patch',
			error: {
				message: 'some error',
			},
		});
	});

	it('may return unresolved parameters when rules fail', () => {
		const res = parseApi({
			api: {
				path: '/test/{id}',
				method: 'patch',
				params: {
					id: 'data.id',
				},
			},
			rules: [
				() => { throw new Error('some error'); },
			],
		});

		expect(res).to.eql({
			href: '/test/{id}',
			method: 'patch',
			error: {
				message: 'some error',
			},
			params: {
				id: true,
			},
		});
	});
});
