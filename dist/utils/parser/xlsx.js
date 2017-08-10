'use strict';

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const Readable = require('stream').Readable;
const XLSX = require('xlsx');
const parse = require('csv-parse');

const { getParseOptions } = require('./csv');

const xlsxParser = (() => {
  var _ref = (0, _asyncToGenerator3.default)(function* (resource, keyed = false) {
    const buffer = yield resource.buffer;
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    // For now we handle only first sheet
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    const stream = new Readable();
    stream.push(csv);
    stream.push(null);
    const parseOptions = getParseOptions(resource.descriptor.dialect, keyed);
    return stream.pipe(parse(parseOptions));
  });

  return function xlsxParser(_x) {
    return _ref.apply(this, arguments);
  };
})();

module.exports = {
  xlsxParser
};