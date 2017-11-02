'use strict';

exports.onHandleCode = (ev) => {
	ev.data.code = ev.data.code // eslint-disable-line
		.replace(/module\.exports = /g, 'export default ')
		.replace(/exports = /g, 'export default ');
};
