'use strict';

/** @private */
module.exports = (transitionRules, ctx) => {
	const rules = Array.isArray(transitionRules) ? transitionRules : [transitionRules];

	for (const rule of rules) {
		if (rule) {
			try { rule(ctx); } catch (e) {
				return e;
			}
		}
	}

	return undefined;
};
