'use strict';

/* eslint no-unused-expressions: 0, class-methods-use-this: 0 */

const toCamelCase = require('./to-camel-case');
const compositState = require('./composit-state');
const parseTrasition = require('./parse-transition');
const findCurrentTransition = require('./find-current-transition');
const findPossibleTransitions = require('./find-possible-transitions');
const getAllTakenNames = require('./get-all-taken-names');
const parseTrasitionApi = require('./parse-transition-api');
const executeTransitionRules = require('./execute-transition-rules');
const isValidStateValue = require('./is-valid-state-value');

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
     * @param {function} options.saveState function with signature `async (ctx, arg1, arg2...) => {...}`
     * @param {function} options.willChangeState function with signature `async (ctx, arg1, arg2...) => {...}`
     * @param {function} options.didChangeState function with signature `async (ctx, arg1, arg2...) => {...}`
     * @param {function} options.willSaveState function with signature `async (ctx, arg1, arg2...) => {...}`
     * @param {function} options.didSaveState function with signature `async (ctx, arg1, arg2...) => {...}`
     * @param {object} options.eventHandler object containin hander for specific trasaction
	 *	```
	 *	{
	 *		beforeTransName: async (ctx, args) => {...},
	 *		afterTransName: async (ctx, args) => {...},
	 *	}
	 *	```
	 * @param {object} options.api object containing global REST API data:
	 *	```
	 *	{
	 *		self: {
	 *			path: '/{entityName}/{id}'
	 *		},
	 *		params: {
	 *			id: 'data.event.id',
	 *			entityName: 'api.data.entityName'
	 *		},
	 *		data: {
	 *			entityName: 'events'
	 *		}
	 *	}
	 *	```
     */
	constructor({ initialState, transitions, data, saveState, willChangeState, didChangeState, willSaveState, didSaveState, eventHandler, api }) {
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
		this._api = api || {};

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
	 * Get all transitions that are valid for the current state of the state machine
	 *
	 * @return {Array.<string>} array of valid transitions name
	 */
	transitions() {
		return findPossibleTransitions(this.state, this._transitions).map(t => t.name);
	}

	/**
	 * Get all transititons that are defined for the state machine in the format
	 * ```javascript
	 * [
	 *	 { name: 'a-to-b', from: 'a', to: 'b' },
	 *	 { name: 'no:op', from: 'a', to: '*' },
	 *	 { name: 'b-to-c', from: 'b', to: 'c' },
	 * ]
	 * }```
	 * @return {Array.<object>} transitions
	 */
	allTransitions() {
		return this._transitions.map(t => Object.assign({}, t));
	}

	/**
	 * Get rest API links for all currently available transitions where defined
	 * ```javascript
	 * // example output:
	 * {
	 *		self: {
	 *			href: '/events/42',
	 *			method: 'get'
	 *		},
	 *		'transition:name:1': {
	 *			href: '/events/42/transition/{param1}',
	 *			method: 'put',
	 *			params: {
	 *				param1: true,
	 *			}
	 *		}
	 * }
	 * ```
	 * @return {object} "restApi" object.
	 */
	restApi() {
		const api = {};
		if (this._api && this._api.self) {
			api.self = parseTrasitionApi({
				api: this._api.self,
				ctx: {
					data: this._data,
					api: this._api,
				},
			});
		}
		findPossibleTransitions(this.state, this._transitions)
			.filter(t => t.api)
			.forEach((t) => {
				api[t.name] = parseTrasitionApi({
					api: t.api,
					ctx: {
						data: this._data,
						api: this._api,
					},
					rules: t.rules,
				});
			});

		return api;
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
	 * Supported syntax:
	 * ```
	 * '*' => allow from any state
	 * 'state1' => allow only from state 'state1'
	 * ['state1', 'state2'] => allow transition from state1 & state2
	 * { state: ['s1', 's2'], substate: ['sub1', 'sub2'] } => allow transition
	 * from all states creates by calculating all
	 * permutations of the given states. 'state:s2|substate:sub1'
	 * 'state:s2|substate:sub1' and 'state:s2|substate:sub2'
	 * ```
	 * @param {(string|object|function} transition.to defines the state that is created after the transition<br><br>
	 * Supported syntax:
	 * ```javascript
	 * '*' => do not change source state
	 * 'state1' => sets target state to 'state1'
	 * { state: 's1' } => sets the property "state" of the current state
	 * to "s1" eg. patches the existing state object representation
	 * async (state, ctx) -> String => stets state from result of the function
	 * { state: async (state, ctx) -> String } => stets substate from result of the function
	 * the result of the function mus be a vaild state string value
	 * ```
	 */
	addTransition(transition) {
		const transitions = Array.isArray(transition) ? transition : [transition];
		transitions.map(parseTrasition)
			.forEach((trans) => {
				if (this._trasitionFunctionNames.indexOf(FSM.toFunctionName(trans.name)) !== -1) {
					const conflicting = this._trasitionFunctionNames[this._trasitionFunctionNames.indexOf(FSM.toFunctionName(trans.name))];
					throw new Error(`Ambigious transtion name: "${trans.name}" conflicts with existing transition: "${conflicting}"`);
				}
				if (getAllTakenNames(this).has(FSM.toFunctionName(trans.name))) {
					throw new Error(`Forbidden transition name: "${trans.name}" forbidden names: "${Array.from(getAllTakenNames(this)).join(', ')}"`);
				}
				this._trasitionFunctionNames.push(FSM.toFunctionName(trans.name));

				this._transitions.push(trans);
				this._buildTransition(trans);
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
				const validNames = this.transitions().map(toCamelCase);

				if (!currentTransition || (validNames.indexOf('*') === -1 && validNames.indexOf(transitionName) === -1)) {
					throw new Error(`Invalid transition: "${transitionName}" in state: "${this.state}"`);
				}

				const from = this.state;
				let to = from;

				const ctx = {
					transition: transitionName,
					from,
					fsm: this,
				};
				if (this._data) {
					ctx.data = this._data;
				}

				const execTransitionFunction = async (fn, state, ctxArg) => {
					const res = await fn(state, ctxArg);
					if (!isValidStateValue(res)) {
						throw new Error(`Invalid "to" function result: "${res}" not a valid state string`);
					}
					return res;
				};

				if (currentTransition.to !== '*') {
					if (typeof currentTransition.to === 'function') {
						to = await execTransitionFunction(currentTransition.to, from, ctx);
					} else if (typeof currentTransition.to === 'string') {
						to = currentTransition.to;
					} else if (typeof currentTransition.to === 'object') {
						const stateObj = FSM.compositState.parse(from);
						const newStateObj = Object.assign({}, stateObj, currentTransition.to);
						for (const key of Object.keys(currentTransition.to)) {
							if (typeof currentTransition.to[key] === 'function') {
								newStateObj[key] = await execTransitionFunction(currentTransition.to[key], stateObj[key], ctx);
							} else {
								newStateObj[key] = currentTransition.to[key];
							}
						}
						to = FSM.compositState.build(newStateObj);
					}
				}

				ctx.to = to;


				const rules = currentTransition.rules || [];
				const error = executeTransitionRules(rules, ctx);
				if (error) {
					const newError = new Error(`Invalid transition: "${transitionName}". Reason: ${error.message}`);
					newError.inner = error;
					throw newError;
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
				result.didChangeState = await callIfSet(this._didChangeState, ctx, args);

				if (this._saveState && typeof this._saveState === 'function') {
					ctx.results = Object.assign({}, result);
					result.willSaveState = await callIfSet(this._willSaveState, ctx, args);

					ctx.results = Object.assign({}, result);
					result.saveState = await this._saveState(ctx, args);

					ctx.results = Object.assign({}, result);
					result.didSaveState = await callIfSet(this._didSaveState, ctx, args);
				}
				ctx.results = Object.assign({}, result);
				result[afterHandler] = await callIfSet(this._eventHandler[afterHandler], ctx, args);

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
