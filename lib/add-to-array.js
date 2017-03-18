'use strict';

module.exports = (array, val) => {
	if (array.indexOf(val) === -1) {
		array.push(val);
	}
};

