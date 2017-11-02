'use strict';

const fs = require('fs');
const path = require('path');

function walk(dir) {
	let results = [];
	const list = fs.readdirSync(dir);
	list.forEach((file) => {
		const newFile = `${dir}/${file}`;
		const stat = fs.statSync(newFile);
		if (stat && stat.isDirectory()) {
			results = results.concat(walk(newFile));
		} else {
			results.push(newFile);
		}
	});
	return results;
}

function loadTests() {
	const fileList = walk(path.join(__dirname, '..'))
		.filter(file => file.indexOf('.specs.js') === file.length - 9 && file.indexOf('node_modules') === -1).forEach((file) => {
			require(file); // eslint-disable-line
		});
	return fileList;
}

describe('fsm', () => {
	try {
		loadTests();
	} catch (e) {
		console.error(e); //eslint-disable-line
	}
});
