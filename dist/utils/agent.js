'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Agent = undefined;

var _stringify = require('babel-runtime/core-js/json/stringify');

var _stringify2 = _interopRequireDefault(_stringify);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// Native
const { parse } = require('url');
const http = require('http');
const https = require('https'

// Packages
);const fetch = require('node-fetch'

/**
 * Returns a `fetch` version with a similar
 * API to the browser's configured with a
 * HTTP2 agent.
 *
 * It encodes `body` automatically as JSON.
 *
 * @param {String} host
 * @return {Function} fetch
 */

);class Agent {
  constructor(url, { tls = true, debug } = {}) {
    this._url = url;
    const parsed = parse(url);
    this._protocol = parsed.protocol;
    this._debug = debug;
    if (tls) {
      this._initAgent();
    }
  }

  _initAgent() {
    const module = this._protocol === 'https:' ? https : http;
    this._agent = new module.Agent({
      keepAlive: true,
      keepAliveMsecs: 10000,
      maxSockets: 8
    }).on('error', err => this._onError(err, this._agent));
  }

  _onError(err, agent) {
    if (this._debug) {
      console.log(`> [debug] agent connection error ${err}\n${err.stack}`);
    }
    if (this._agent === agent) {
      this._agent = null;
    }
  }

  fetch(path, opts = {}) {
    if (!this._agent) {
      if (this._debug) {
        console.log('> [debug] re-initializing agent');
      }
      this._initAgent();
    }

    const { body } = opts;
    if (this._agent) {
      opts.agent = this._agent;
    }

    if (body && typeof body === 'object' && typeof body.pipe !== 'function') {
      opts.headers['Content-Type'] = 'application/json';
      opts.body = (0, _stringify2.default)(body);
    }

    if (opts.body && typeof body.pipe !== 'function') {
      opts.headers['Content-Length'] = Buffer.byteLength(opts.body);
    }

    return fetch(this._url + path, opts);
  }

  close() {
    if (this._debug) {
      console.log('> [debug] closing agent');
    }

    if (this._agent) {
      this._agent.destroy();
    }
  }
}
exports.Agent = Agent;