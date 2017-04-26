'use strict';

/* eslint no-unused-expressions: 0, class-methods-use-this: 0 */

const toCamelCase = require('./to-camel-case');
const compositState = require('./composit-state');
const addToArray = require('./add-to-array');
const parseTrasition = require('./parse-transition');
const findCurrentTransition = require('./find-current-transition');
const getAllTakenNames = require('./get-all-taken-names');

const allStates = (transitions) => {
	const states = [];
	transitions.forEach((t) => {
		['from', 'to'].forEach((key) => {
			addToArray(states, t[key]);
		});
	});
	states.sort();
	return states;
};

const validTransitions = (state, transitions) => {
	const ts = [];

	transitions.forEach((t) => {
		const from = t.from;
		if (from.indexOf(state) !== -1) {
			addToArray(ts, t.name);
		}
	});

	ts.sort();
	return ts;
};

const callIfSet = async (handler, ctx, args) => {
	if (handler && typeof handler === 'function') {
		const a = [ctx].concat(args);
		return handler(...a);
	}
	return null;
};

/**
 * Class representing a Finite State Machine
 * @class
 */
class FSM {

	/**
	 * Returns the composit state tool used to parse and build state strings from objects
	 *
	 * @return {CompositState} the composit sate tool
	 */
	static get compositState() {
		return compositState;
	}

	/**
	 * Create a camelCase function name formthe given string. Used internally to convert transition names to function names
	 *
	 * @param {string} name the name to transform
	 *
	 * @return {string} camelCased version of the given name
	 */
	static toFunctionName(name) {
		return toCamelCase(name);
	}
	/**
     * Create a new state machine.
     * @param {object} options the initalisation object.
     * @param {object} options.initialState the state string used to initialize the state machine
     * @param {Array.<object>} options.transitions array of defined transitions
     * @param {object} options.data the data that is stored in the state machine
     * @param {function} options.saveState function with signature "async (ctx, arg1, arg2...) => {...}"
     * @param {function} options.willChangeState function with signature "async (ctx, arg1, arg2...) => {...}"
     * @param {function} options.didChangeState function with signature "async (ctx, arg1, arg2...) => {...}"
     * @param {function} options.willSaveState function with signature "async (ctx, arg1, arg2...) => {...}"
     * @param {function} options.didSaveState function with signature "async (ctx, arg1, arg2...) => {...}"
     * @param {object} options.eventHandler object containin hander for specific trasaction
	 *	{ beforeTransName: async (ctx, args) => {...}, afterTransName: async (ctx, args) => {...}
     */
	constructor({ initialState, transitions, data, saveState, willChangeState, didChangeState, willSaveState, didSaveState, eventHandler }) {
		this._state = '__uninitialized__';
		this._transitions = [];
		this._saveState = saveState;
		this._willChangeState = willChangeState;
		this._didChangeState = didChangeState;
		this._willSaveState = willSaveState;
		this._didSaveState = didSaveState;
		this._data = data;
		this._eventHandler = eventHandler || {};
		this._trasitionFunctionNames = [];

		if (transitions) {
			this.addTransition(transitions);
		}

		if (initialState) {
			this.init(initialState);
		}
	}

	/**
	 * Initalize an existing state machine with the given state
	 *
	 * @param {string} state the state string to set. The string must be one of the existing
	 * states of the state machine
	 */
	init(state) {
		if (this.states().indexOf(state) === -1) {
			throw new Error(`Invlaid state: "${state}" known states: ${this.states().join(', ')}`);
		}
		this._state = state;
		return this;
	}

	/**
	 * Get the current state string
	 *
	 * @return {string} the state string
	 */
	get state() {
		return this._state;
	}

	/**
	 * @private
	 */
	set state(_) {
		throw new Error('cannot set state');
	}

	/**
	 * Get the data stored in the state machine
	 *
	 * @return {object} the stored data objec
	 */
	get data() {
		return this._data;
	}

	/**
	 * Set the data stored in the state machine
	 *
	 * @param {object} value the data object
	 */
	set data(value) {
		this._data = value;
	}

	/**
	 * Get all known states of the state machine
	 *
	 * @return {Array.<string>} array of state strings
	 */
	states() {
		return allStates(this._transitions).filter(s => s !== '*');
	}

	/**
	 * Get all transitions that are valid for the current state of the state machine
	 *
	 * @return {Array.<string>} array of valid transitions name
	 */
	transitions() {
		return validTransitions(this.state, this._transitions);
	}

	/**
	 * Execute a transition
	 *
	 * @param {string} transition the name of the transition
	 * @param {...any} args list of arguments passed to the event handlers during transition
	 *
	 * @return {object} object containing the results of the executed event handlers
	 */
	execute(transition, ...args) {
		return this[FSM.toFunctionName(transition)](...args);
	}


	/**
	 * Add a new transition to the state machine
	 *
	 * @param {object} transition the name of the transition<br><br>
	 * Suported syntax: (camelCasle, colon:case, snake_case, dash-case)<br>
	 * myTransition, my:transition, my_transition, my-transition => will create function .myTransition()
	 * @param {string} transition.name the name of the transition
	 * @param {(string|object|Array.<string>|Array.<object>)} transition.form the states from which this
	 * transition can be triggered.<br><br>
	 * Supported syntax:<br>
	 * '*' => allow from any state
	 * 'state1' => allow only from state 'state1'<br>
	 * ['state1', 'state2'] => allow transition from state1 & state2<br>
	 * { state: ['s1', 's2'], substate: ['sub1', 'sub2'] } => allow transition from all states creates by calculating all<br>
	 * permutations of the given states. 'state:s2|substate:sub1' 'state:s2|substate:sub1' 'state:s2|substate:sub2'
	 * @param {(string|object} transition.form defines the state that is created after the transition<br><br>
	 * Supported syntax:<br>
	 * '*' => do not change source state<br>
	 * 'state1' => sets target state to 'state1'<br>
	 * { state: 's1' } => sets the property "state" of the current state to "s1" eg. patches the existing state object representation
	 */
	addTransition(transition) {
		const transitions = Array.isArray(transition) ? transition : [transition];
		transitions.map(parseTrasition).forEach((transArray) => {
			transArray.forEach((trans, index) => {
				if (index === 0) {
					if (this._trasitionFunctionNames.indexOf(FSM.toFunctionName(trans.name)) !== -1) {
						const conflicting = this._trasitionFunctionNames[this._trasitionFunctionNames.indexOf(FSM.toFunctionName(trans.name))];
						throw new Error(`Ambigious transtion name: "${trans.name}" conflicts with existing transition: "${conflicting}"`);
					}
					if (getAllTakenNames(this).has(FSM.toFunctionName(trans.name))) {
						throw new Error(`Forbidden transition name: "${trans.name}" forbidden names: "${Array.from(getAllTakenNames(this)).join(', ')}"`);
					}
				}
				if (index === 0) {
					this._trasitionFunctionNames.push(FSM.toFunctionName(trans.name));
				}

				this._transitions.push(trans);
				this._buildTransition(trans);
			});
		});
		return this;
	}

	_buildTransition(trans) {
		const transitionName = toCamelCase(trans.name);
		if (this[transitionName]) return;

		/**
		 * Run-time created transition methods
		 *
		 * @param {...any} args the arguments that will be passed to event handlers
		 *
		 * @return {object} contains the result objects from the event handlers
		 */
		this[transitionName] = async (...args) => {
			if (this.__inTransition) {
				throw new Error('Cannot start transition when during running transition');
			}
			this.__inTransition = true;
			try {
				const currentTransition = findCurrentTransition(transitionName, this.state, this._transitions);
				// console.log(currentTransition);
				const validNames = this.transitions().map(toCamelCase);
				if (!currentTransition || (validNames.indexOf('*') === -1 && validNames.indexOf(transitionName) === -1)) {
					throw new Error(`Invalid transition: "${transitionName}" in state: "${this.state}"`);
				}
				const from = this.state;
				const to = currentTransition.to === '*' ? from : currentTransition.to;
				const ctx = {
					transition: transitionName,
					from,
					to,
					fsm: this,
				};
				if (this._data) {
					ctx.data = this._data;
				}
				const beforeHandler = `before${transitionName[0].toUpperCase()}${transitionName.substring(1)}`;
				const afterHandler = `after${transitionName[0].toUpperCase()}${transitionName.substring(1)}`;

				const result = {};
				ctx.results = result;
				result.willChangeState = await callIfSet(this._willChangeState, ctx, args);
				ctx.results = Object.assign({}, result);
				result[beforeHandler] = await callIfSet(this._eventHandler[beforeHandler], ctx, args);
			// console.log(`Change state: "${from}" => "${to}"`)
				this._state = to;
				ctx.results = Object.assign({}, result);
				result[afterHandler] = await callIfSet(this._eventHandler[afterHandler], ctx, args);
				ctx.results = Object.assign({}, result);
				result.didChangeState = await callIfSet(this._didChangeState, ctx, args);

				if (this._saveState && typeof this._saveState === 'function') {
					ctx.results = Object.assign({}, result);
					result.willSaveState = await callIfSet(this._willSaveState, ctx, args);
					ctx.results = Object.assign({}, result);
					result.saveState = await this._saveState(ctx, args);
					ctx.results = Object.assign({}, result);
					result.didSaveState = await callIfSet(this._didSaveState, ctx, args);
				}

				this.__inTransition = false;
				return result;
			} catch (e) {
				this.__inTransition = false;
				throw e;
			}
		};
	}
}

module.exports = FSM;
