'use strict';

const compositState = require('./composit-state');

const matchObjects = (stateObj, fromObj) => {
	const stateKeys = Object.keys(stateObj);
	for (const stateKey of stateKeys) {
		if (!fromObj[stateKey]) return false;
		const stateKeyValue = stateObj[stateKey];
		const fromValues = Array.isArray(fromObj[stateKey]) ? fromObj[stateKey] : [fromObj[stateKey]];
		if (fromValues.indexOf(stateKeyValue) === -1) return false;
	}
	return true;
};


const matchState = (state, trans) => {
	if (trans.from === '*') return true;
	const froms = Array.isArray(trans.from) ? trans.from : [trans.from];
	if (state.indexOf(':') === -1) {
		return froms.indexOf(state) !== -1;
	}


	const stateObj = compositState.parse(state);

	for (const from of froms) {
		if (typeof from === 'object') {
			if (matchObjects(stateObj, from)) return true;
		}
	}
	return false;
};

/** @private */
module.exports = (state, transitions) => transitions.filter(t => matchState(state, t));
