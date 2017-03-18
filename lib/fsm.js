'use strict';

/* eslint no-unused-expressions: 0, class-methods-use-this: 0 */

const toCamelCase = require('./to-camel-case');
const compositState = require('./composit-state');
const addToArray = require('./add-to-array');
const validateTransition = require('./validate-transition');

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
	constructor({ init, transitions, data, saveState, willChangeState, didChangeState, willSaveState, didSaveState, eventHandler }) {
		this._state = '__uninitialized__';
		this._transitions = transitions || [];
		this._saveState = saveState;
		this._willChangeState = willChangeState;
		this._didChangeState = didChangeState;
		this._willSaveState = willSaveState;
		this._didSaveState = didSaveState;
		this._data = data;
		this._eventHandler = eventHandler || {};

		if (init) {
			this.init(init);
		}
		this._buildAPI();
	}

	init(state) {
		if (this.states().indexOf(state) === -1) {
			throw new Error(`Invlaid state: "${state}" known states: ${this.allStates().join(', ')}`);
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

	states() {
		return allStates(this._transitions).filter(s => s !== '*');
	}

	transitions() {
		return validTransitions(this.state, this._transitions);
	}

	addTransition(transition) {
		const transitions = Array.isArray(transition) ? transition : [transition];
		transitions.forEach((trans) => {
			validateTransition(trans);
			this._transitions.push(trans);
			this._buildTransition(trans);
		});
		return this;
	}

	_buildAPI() {
		this._transitions.forEach((trans) => {
			validateTransition(trans);
			this._buildTransition(trans);
		});
	}

	_buildTransition(trans) {
		const transitionName = toCamelCase(trans.name);
		this[transitionName] = async (...args) => {
			const from = this.state;
			const to = trans.to === '*' ? from : trans.to;
			const validNames = this.transitions().map(toCamelCase);
			if (validNames.indexOf('*') === -1 && validNames.indexOf(transitionName) === -1) {
				throw new Error(`Invalid transition: "${transitionName}" in state: "${this.state}"`);
			}
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
			result.willChangeState = await callIfSet(this._willChangeState, ctx, args);
			result[beforeHandler] = await callIfSet(this._eventHandler[beforeHandler], ctx, args);
			this._state = to;
			result[afterHandler] = await callIfSet(this._eventHandler[afterHandler], ctx, args);
			result.didChangeState = await callIfSet(this._didChangeState, ctx, args);

			if (this._saveState && typeof this._saveState === 'function') {
				result.willSaveState = await callIfSet(this._willSaveState, ctx, args);
				result.saveState = await this._saveState(ctx, args);
				result.didSaveState = await callIfSet(this._didSaveState, ctx, args);
			}
			return result;
		};
	}
}

module.exports = FSM;
