"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _stream = require("stream");

var _sharp = require("sharp");

var _sharp2 = _interopRequireDefault(_sharp);

var _crypto = require("crypto");

var _crypto2 = _interopRequireDefault(_crypto);

var _request = require("request");

var _request2 = _interopRequireDefault(_request);

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const numberOrNull = maybeNumber => maybeNumber ? parseInt(maybeNumber) : null;

const getFormat = (fm, urlFm) => {
  if (fm === 'jpeg' || fm === 'png' || fm === 'webp') {
    return fm;
  } else if (urlFm === 'jpeg' || urlFm === 'png' || urlFm === 'webp') {
    return urlFm;
  } else {
    return 'jpeg';
  }
};

const createTransformer = query => {
  const { width, height, format } = query;
  let transformer = (0, _sharp2.default)();
  transformer.resize(width, height);
  return transformer[format]();
};

const saveStreamTo = filePath => stream => stream.pipe(_fs2.default.createWriteStream(filePath));

const splitStreamTo = (dest1, dest2) => readStream => {
  dest1(readStream.pipe(new _stream.PassThrough()));
  dest2(readStream.pipe(new _stream.PassThrough()));
};

const streamImageTo = res => format => responseStream => {
  res.writeHead(200, {
    'Content-Type': `image/${format}`
  });
  responseStream.pipe(res);
};

const cleanQuery = query => ({
  url: query.url,
  width: numberOrNull(query.w),
  height: numberOrNull(query.h),
  format: getFormat(query.fm, query.url.split('.').pop())
});

exports.default = (req, res) => {
  const query = cleanQuery(req.query);
  const hash = _crypto2.default.createHash('sha1').update(JSON.stringify(query)).digest('hex');
  const filePath = `/tmp/${hash}.${query.format}`;
  const fileExists = _fs2.default.existsSync(filePath);
  const streamImageToRes = streamImageTo(res)(query.format);
  if (false) {
    const fileStream = _fs2.default.createReadStream(filePath);
    streamImageToRes(fileStream);
  } else {
    const getImage = (0, _request2.default)(query.url);
    getImage.on('response', res => {
      if (res.statusCode === 404) {
        res.status(404).send('Url not found');
      } else {
        const imageStream = getImage.pipe(createTransformer(query));
        const saveStreamToDisk = saveStreamTo(filePath);
        splitStreamTo(saveStreamToDisk, streamImageToRes)(imageStream);
      }
    });
  }
};
