'use strict';

/** @private */
module.exports = (str) => {
	const words = str.split(/[_-]|:/);
	let result = words[0];
	for (let n = 1; n < words.length; n++) {
		result = result + words[n].charAt(0).toUpperCase() + words[n].substring(1);
	}
	return result;
};
