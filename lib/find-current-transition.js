'use strict';

const toCamelCase = require('./to-camel-case');

module.exports = (transitionName, state, transitions) => {
	const matches = transitions.filter(t => toCamelCase(t.name) === transitionName)
		.filter(t => Array.isArray(t.from) ? t.from.indexOf(state) !== -1 : t.from === state); //eslint-disable-line

	if (matches.length > 1) {
		throw new Error(`Ambigious transitions found: ${matches.map(m => JSON.stringify(m)).join(' ')}`);
	}
	return matches[0];
};
