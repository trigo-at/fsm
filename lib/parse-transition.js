'use strict';

const compositState = require('./composit-state.js');

module.exports = (transition) => {
	const trans = Object.assign({}, transition);
	if (!trans.name || !trans.name.replace(/ /g, '') || trans.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${trans.name}`);
	}

	const froms = Array.isArray(trans.from) ? trans.from : [trans.from];
	trans.from = froms.map((from) => {// eslint-disable-line
		if (from && typeof from === 'object') {
			from = compositState.build(from); // eslint-disable-line
		}

		if (!from || !from.replace(/ /g, '') || from === '__uninitialized__') {
			throw new Error(`Invalid transition from: ${from}`);
		}
		return from;
	});

	if (typeof trans.to === 'object') {
		trans.to = compositState.build(trans.to); // eslint-disable-line
	}
	if (!trans.to || !trans.to.replace(/ /g, '') || trans.to === '__uninitialized__') {
		throw new Error(`Invalid transition to: ${trans.to}`);
	}

	return trans;
};
