'use strict';

const isValidStateValue = require('./is-valid-state-value');

const validateFromTo = (fromTo) => {
	const froms = Array.isArray(fromTo) ? fromTo : [fromTo];
	froms.forEach((from) => {
		if (!from || (typeof from === 'string' && (!isValidStateValue(from) || from === '__uninitialized__'))) {
			throw new Error(`Invalid state value! from: ${from}`);
		} else if (typeof from === 'object') {
			Object.keys(from).forEach((fromKey) => {
				const fromVal = Array.isArray(from[fromKey]) ? from[fromKey] : [from[fromKey]];
				fromVal.forEach((val) => {
					if ((typeof val === 'string') && (!isValidStateValue(val) || from === '__uninitialized__')) {
						throw new Error(`Invalid state value! from: ${from}`);
					}
				});
			});
		}
	});
};

/** @private */
module.exports = (transition) => {
	const trans = Object.assign({}, transition);
	if (!trans.name || !trans.name.replace(/ /g, '') || trans.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${trans.name}`);
	}
	validateFromTo(trans.from);
	validateFromTo(trans.to);

	return trans;
};
