'use strict';

/* eslint no-unused-expressions: 0, class-methods-use-this: 0 */

const toCamelCase = require('./to-camel-case');
const compositState = require('./composit-state');
const addToArray = require('./add-to-array');
const parseTrasition = require('./parse-transition');
const findCurrentTransition = require('./find-current-transition');

const allStates = (transitions) => {
	const states = [];
	transitions.forEach((t) => {
		['from', 'to'].forEach((key) => {
			if (Array.isArray(t[key])) {
				t.from.forEach(s => addToArray(states, s));
			} else {
				addToArray(states, t[key]);
			}
		});
	});
	states.sort();
	return states;
};

const validTransitions = (state, transitions) => {
	const ts = [];

	transitions.forEach((t) => {
		const from = Array.isArray(t.from) ? t.from : [t.from];
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

class FSM {
	static get compositState() {
		return compositState;
	}

	static toFunctionName(str) {
		return toCamelCase(str);
	}

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

		if (transitions) {
			this.addTransition(transitions);
		}

		if (initialState) {
			this.init(initialState);
		}
	}

	init(state) {
		if (this.states().indexOf(state) === -1) {
			throw new Error(`Invlaid state: "${state}" known states: ${this.states().join(', ')}`);
		}
		this._state = state;
		return this;
	}

	get state() {
		return this._state;
	}

	set state(_) {
		throw new Error('cannot set state');
	}

	get data() {
		return this._data;
	}

	set data(value) {
		this._data = value;
	}

	states() {
		return allStates(this._transitions).filter(s => s !== '*');
	}

	transitions() {
		return validTransitions(this.state, this._transitions);
	}

	addTransition(transition) {
		const transitions = Array.isArray(transition) ? transition : [transition];
		transitions.map(parseTrasition).forEach((transArray) => {
			transArray.forEach((trans) => {
				this._transitions.push(trans);
				this._buildTransition(trans);
			});
		});
		return this;
	}

	_buildTransition(trans) {
		const transitionName = toCamelCase(trans.name);
		if (this[transitionName]) return;
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
