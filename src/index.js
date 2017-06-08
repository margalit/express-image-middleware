// @flow
import type { $Request, $Response } from "express";
import { PassThrough } from 'stream';
import sharp from "sharp";
import crypto from "crypto";
import request from "request";
import fs from "fs";

type SharpType = {
  resize: (?number, ?number) => SharpType,
  jpeg: () => SharpType,
  png: () => SharpType,
  webp: () => SharpType,
}

type ImageType =
  | 'jpeg'
  | 'png'
  | 'webp'

type QueryType = {|
  url: string,
  width: ?number,
  height: ?number,
  format: ImageType,
|}

const numberOrNull = (maybeNumber : ?string) =>
  maybeNumber ? parseInt(maybeNumber) : null

const getFormat = (fm: ?string, urlFm: string) : ImageType => {
  if (fm === 'jpeg' || fm === 'png' || fm === 'webp') {
    return fm
  } else if (urlFm === 'jpeg' || urlFm === 'png' || urlFm === 'webp') {
    return urlFm
  } else {
    return 'jpeg'
  }
}

const createTransformer = (query: QueryType) => {
  const { width, height, format } = query
  let transformer = sharp()
  transformer.resize(width, height)
  return transformer[format]()
}

const saveStreamTo = filePath => stream =>
  stream.pipe(fs.createWriteStream(filePath))

const splitStreamTo = (dest1, dest2) => readStream => {
  dest1(readStream.pipe(new PassThrough()))
  dest2(readStream.pipe(new PassThrough()))
}

const streamImageTo = res => format => responseStream => {
  res.writeHead(200, {
    'Content-Type' : `image/${format}`
  });
  responseStream.pipe(res)
}

const cleanQuery = (query: Object) => ({
  url: query.url,
  width: numberOrNull(query.w),
  height: numberOrNull(query.h),
  format: getFormat(query.fm, query.url.split('.').pop()),
})

export default (req: $Request, res: $Response) => {
  const query = cleanQuery(req.query)
  const hash : string = crypto.createHash('sha1').update(JSON.stringify(query)).digest('hex')
  const filePath = `/tmp/${hash}.${query.format}`
  const fileExists = fs.existsSync(filePath)
  const streamImageToRes = streamImageTo(res)(query.format)
  if (false) {
    const fileStream = fs.createReadStream(filePath)
    streamImageToRes(fileStream)
  } else {
    const getImage = request(query.url)
    getImage.on('response', res => { 
      if(res.statusCode === 404) {
        res.status(404).send('Url not found')
      } else {
        const imageStream = getImage.pipe(createTransformer(query))
        const saveStreamToDisk = saveStreamTo(filePath)
        splitStreamTo(saveStreamToDisk, streamImageToRes)(imageStream)
      } 
    })
  }
}
