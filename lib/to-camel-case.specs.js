'use strict';

const { expect } = require('chai');
const toCamelCase = require('./to-camel-case');

describe('toCamelCase', () => {
	it('worsWith "_" delimiter', () => {
		expect(toCamelCase('test_func_name')).to.equal('testFuncName');
	});
	it('worsWith "-" delimiter', () => {
		expect(toCamelCase('test-func-name')).to.equal('testFuncName');
	});
	it('worsWith ":" delimiter', () => {
		expect(toCamelCase('test:func:name')).to.equal('testFuncName');
	});
});
