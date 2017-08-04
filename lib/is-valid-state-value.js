'use strict';

const STATE_KEY_REGEX = /^([a-zA-Z0-9-_.#/@$%^!=<>+~?]+|\*)$/;

/** @private */
module.exports = value => value.match(STATE_KEY_REGEX);
