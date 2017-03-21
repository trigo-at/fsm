'use strict';

const compositState = require('./composit-state.js');

module.exports = (transition) => {
	const trans = Object.assign({}, transition);
	if (!trans.name || !trans.name.replace(/ /g, '') || trans.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${trans.name}`);
	}

	if (!trans.to) throw new Error(`Invalid transition to: ${trans.to}`);
	if (typeof trans.to === 'string') {
		if (!trans.to || !trans.to.replace(/ /g, '') || trans.to === '__uninitialized__') {
			throw new Error(`Invalid transition to: ${trans.to}`);
		}
	}

	const froms = Array.isArray(trans.from) ? trans.from : [trans.from];
	return trans.from = froms.map((from) => {// eslint-disable-line
		let to = trans.to;
		if (typeof trans.to === 'object' && typeof from === 'object') {
			to = compositState.build(Object.assign({}, from, trans.to));
		} else if (typeof trans.to === 'object') {
			to = compositState.build(trans.to);
		}

		const t = { name: trans.name, to };
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
