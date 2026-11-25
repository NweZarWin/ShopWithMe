const maxRefundProofBytes = 2 * 1024 * 1024;

export function parseRefundProofDataUrl(value) {
  if (typeof value !== 'string') return null;

  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) return null;

  const [, mimeType, encodedImage] = match;
  const image = Buffer.from(encodedImage, 'base64');
  if (image.length === 0 || image.length > maxRefundProofBytes) return null;
  if (image.toString('base64') !== encodedImage) return null;

  const isPng = mimeType === 'image/png'
    && image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg = mimeType === 'image/jpeg'
    && image[0] === 0xff
    && image[1] === 0xd8
    && image[2] === 0xff;
  const isWebp = mimeType === 'image/webp'
    && image.toString('ascii', 0, 4) === 'RIFF'
    && image.toString('ascii', 8, 12) === 'WEBP';

  return isPng || isJpeg || isWebp ? value : null;
}

export function serializeReturnRequest(returnRequest) {
  if (!returnRequest) return null;

  const { refundProofDataUrl, ...returnRequestData } = returnRequest.toJSON();
  return {
    ...returnRequestData,
    hasRefundProof: Boolean(refundProofDataUrl)
  };
}
