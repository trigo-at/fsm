'use strict';

const compositState = require('./composit-state.js');

const explodeKey = (froms, key) => {
	const ret = [];
	froms.forEach((from) => {
		// if (Array.isArray(from[key])) {
			from[key].forEach((val) => {
				const patch = {};
				patch[key] = val;
				ret.push(Object.assign({}, from, patch));
			});
		// }
	});
	return ret;
};

const explode = (from) => {
	const keys = Object.keys(from);
	let froms = [from];
	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (Array.isArray(from[key])) {
			froms = explodeKey(froms, key);
		}
	}
	return froms;
};

const createPermutations = (froms) => {
	const sets = froms.map(explode);
	const flat = [];
	sets.forEach((set) => {
		set.forEach((line) => {
			flat.push(line);
		});
	});

	return flat;
};


module.exports = (transition) => {
	const trans = Object.assign({}, transition);
	if (!trans.name || !trans.name.replace(/ /g, '') || trans.name === '__uninitialized__') {
		throw new Error(`Invalid transition name: ${trans.name}`);
	}

	if (!trans.to) throw new Error(`Invalid transition to: ${trans.to}`);
	if (typeof trans.to === 'string') {
		if (!trans.to || !trans.to.replace(/ /g, '') || trans.to === '__uninitialized__') {
			throw new Error(`Invalid transition to: ${trans.to}`);
		}
	}

	let froms = Array.isArray(trans.from) ? trans.from : [trans.from];
	froms.forEach((from) => {
		if (!from) {
			throw new Error(`Invalid transition from: ${from}`);
		}
	});
	froms = createPermutations(froms);
	return trans.from = froms.map((from) => {// eslint-disable-line
		let to = trans.to;
		if (typeof trans.to === 'object' && typeof from === 'object') {
			to = compositState.build(Object.assign({}, from, trans.to));
		} else if (typeof trans.to === 'object') {
			to = compositState.build(trans.to);
		}

		const t = { name: trans.name, to };
		if (from && typeof from === 'object') {
			t.from = compositState.build(from); // eslint-disable-line
		} else {
			t.from = from;
		}

		if (!t.from || !t.from.replace(/ /g, '') || t.from === '__uninitialized__') {
			throw new Error(`Invalid transition from: ${t.from}`);
		}
		return t;
	});
};
