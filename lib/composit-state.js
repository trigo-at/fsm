'use strict';

const isValidStateValue = require('./is-valid-state-value');

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
		if (!isValidStateValue(options[key])) {
			throw new Error(`Invalid state value! from: ${options[key]}`);
		}
		states.push(`${key}:${options[key]}`);
	});
	return states.sort().join('|');
};

/**
 *
 * Class to build, parse and manipulate composit states<br>
 *
 * State object in FSM are converted to string using this class<br>
 * The state object { a: 'val1', b: 'val2', c: 'val3' } is internaly stored<br>
 * in its string repreentation: "a:val1|b:val2|c:val3"
 *
 * This utillity class is available from {@link FSM#compositState} property
 *
 * @class
 */
class CompositState {
	/**
	 * Build a state string from a javascript object
	 *
	 * @param {object} stateObj the state object
	 *
	 * @return {string} the string representation of the object
	 */
	static build(stateObj) {
		return build(stateObj);
	}

	/**
	 * Build a state string from a javascript object
	 *
	 * @param {string} state the string representation of the object
	 *
	 * @return {object} the state object
	 */
	static parse(state) {
		return parse(state);
	}
}

module.exports = CompositState;
