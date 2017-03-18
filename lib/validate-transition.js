'use strict';

module.exports = (transition) => {
	if (!transition.name || !transition.name.replace(/ /g, '') || transition.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${transition.name}`);
	}
	const froms = Array.isArray(transition.from) ? transition.from : [transition.from];
	froms.forEach((from) => {
		if (!from || !from.replace(/ /g, '') || from === '__uninitialized__') {
			throw new Error(`Invalid transition from: ${from}`);
		}
	});
	const to = transition.to;
	if (!to || !to.replace(/ /g, '') || to === '__uninitialized__') {
		throw new Error(`Invalid transition to: ${to}`);
	}
};
