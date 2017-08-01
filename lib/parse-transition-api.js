'use strict';

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

const replaceFromParams = (path, params, ctx) => {
	let href = path;
	Object.keys(params).forEach((key) => {
		const value = getNested(ctx, params[key]);
		if (value === undefined) {
			throw new Error(`Cannot resolve param: "${key}" data path: "${params[key]}"`);
		}
		href = href.replace(new RegExp(`{${key}}`, 'g'), value);
	});

	return href;
};

module.exports = ({ api, ctx }) => {
	if (!api) throw new Error('Argument "api" missing');
	if (!api.path) throw new Error('Argument "api.path" missing');

	const method = api.method || 'get';

	let href = api.path;
	if (ctx && ctx.api && ctx.api.params) {
		href = replaceFromParams(href, ctx.api.params, ctx);
	}
	if (api.params) {
		href = replaceFromParams(href, api.params, ctx);
	}

	return {
		href,
		method,
	};
};
