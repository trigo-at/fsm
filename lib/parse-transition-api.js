'use strict';

const executeTransitionRules = require('./execute-transition-rules');

function getNested(theObject, path) {
	try {
		const separator = '.';

		return path
			.replace('[', separator).replace(']', '')
			.split(separator)
			.reduce(
				(obj, property) => obj[property], theObject,
			);
	} catch (err) {
		return undefined;
	}
}

const replaceFromParams = (path, params, ctx, error) => {
	let href = path;
	Object.keys(params).forEach((key) => {
		const value = getNested(ctx, params[key]);
		if (value === undefined && !error) {
			throw new Error(`Cannot resolve param: "${key}" data path: "${params[key]}"`);
		}
		if (value !== undefined) {
			href = href.replace(new RegExp(`{${key}}`, 'g'), value);
		}
	});

	return href;
};

const extractParams = (path) => {
	const matches = path.match(/\{.*?\}/g);
	if (!matches) return undefined;
	const params = {};
	matches.forEach((m) => {
		params[m.replace(/\{/, '').replace(/\}/, '')] = true;
	});
	return params;
};

/** @private */
module.exports = ({ api, ctx, rules }) => {
	if (!api) throw new Error('Argument "api" missing');
	if (!api.path) throw new Error('Argument "api.path" missing');
	const method = api.method || 'get';

	const transitionRules = rules || [];
	const error = executeTransitionRules(transitionRules, ctx);

	let href = api.path;
	if (ctx && ctx.api && ctx.api.params) {
		href = replaceFromParams(href, ctx.api.params, ctx, error);
	}
	if (api.params) {
		href = replaceFromParams(href, api.params, ctx, error);
	}

	const params = extractParams(href);

	const link = {
		href,
		method,
	};

	if (params) {
		link.params = params;
	}

	if (error) {
		link.error = { message: error.message };
	}

	return link;
};
