'use strict';

const toCamelCase = require('./to-camel-case');
const findPossibleTransitions = require('./find-possible-transitions');

/** @private */
module.exports = (transitionName, state, transitions) => {
	const matches = findPossibleTransitions(state, transitions.filter(t => toCamelCase(t.name) === transitionName));

	if (matches.length > 1) {
		throw new Error(`Ambigious transitions found: ${matches.map(m => JSON.stringify(m)).join(' ')}`);
	}
	return matches[0];
};
