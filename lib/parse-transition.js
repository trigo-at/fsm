'use strict';

const compositState = require('./composit-state.js');

module.exports = (transition) => {
	const trans = Object.assign({}, transition);
	if (!trans.name || !trans.name.replace(/ /g, '') || trans.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${trans.name}`);
	}

	if (typeof trans.to === 'object') {
		trans.to = compositState.build(trans.to); // eslint-disable-line
	}
	if (!trans.to || !trans.to.replace(/ /g, '') || trans.to === '__uninitialized__') {
		throw new Error(`Invalid transition to: ${trans.to}`);
	}

	const froms = Array.isArray(trans.from) ? trans.from : [trans.from];
	return trans.from = froms.map((from) => {// eslint-disable-line
		const t = { name: trans.name, to: trans.to };
		if (from && typeof from === 'object') {
			t.from = compositState.build(from); // eslint-disable-line
		} else {
			t.from = from;
		}

		if (!t.from || !t.from.replace(/ /g, '') || t.from === '__uninitialized__') {
			throw new Error(`Invalid transition from: ${t.from}`);
		}
		return t;
	});
};
