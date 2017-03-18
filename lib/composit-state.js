'use strict';

const parse = (state) => {
	const obj = {};
	state.split('|').forEach((part) => {
		const keyVal = part.split(':');
		obj[keyVal[0]] = keyVal[1];
	});
	return obj;
};

const build = (options) => {
	const states = [];
	Object.keys(options).forEach((key) => {
		states.push(`${key}:${options[key]}`);
	});
	return states.sort().join('|');
};

const get = (key, state) => {
	const obj = parse(state);
	if (!obj[key]) {
		throw new Error(`Invalid state key: "${key}" state: "${state}"`);
	}
	return parse(state)[key];
};

const set = (key, value, state) => {
	const obj = parse(state);
	if (!obj[key]) {
		throw new Error(`Invalid state key: "${key}" state: "${state}"`);
	}
	obj[key] = value;
	return build(obj);
};

module.exports = (state) => {
	return {
		get: key => get(key, state),
		set: (key, value) => set(key, value, state),
	};
};
module.exports.build = obj => build(obj);
module.exports.parse = parse;
