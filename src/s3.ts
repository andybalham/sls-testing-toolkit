// Copied from https://github.com/erezrokah/aws-testing-library

/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import AWS = require('aws-sdk');

const listAllKeys = async (
  region: string,
  bucket: string,
  prefix: string | undefined,
  token: string | undefined
) => {
  const s3 = new AWS.S3({ region });
  const opts = {
    Bucket: bucket,
    ContinuationToken: token,
    ...(prefix && { Prefix: prefix }),
  };
  const data = await s3.listObjectsV2(opts).promise();
  let allKeys = data.Contents || [];
  if (data.IsTruncated) {
    allKeys = allKeys.concat(await listAllKeys(region, bucket, prefix, data.NextContinuationToken));
  }

  return allKeys;
};

export const clearAllObjects = async (region: string, bucket: string, prefix?: string) => {
  const allKeys = await listAllKeys(region, bucket, prefix, undefined);
  if (allKeys.length > 0) {
    const s3 = new AWS.S3({ region });
    const objects = allKeys.map((item) => ({ Key: item.Key || '' }));
    await s3
      .deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: objects,
          Quiet: false,
        },
      })
      .promise();
  }
};

export const getObject = async (region: string, bucket: string, key: string) => {
  try {
    const s3 = new AWS.S3({ region });
    // throws error if key not found
    const body = (await s3.getObject({ Bucket: bucket, Key: key }).promise()).Body as Buffer;
    return { body, found: true };
  } catch (e) {
    if (e.code === 'NoSuchKey') {
      return { body: null, found: false };
    }
    throw e;
  }
};
