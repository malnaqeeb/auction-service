import createError from 'http-errors';

const { listAuctions } = require('../repositories/auction');
const { mapper } = require('../repositories/mapper');
async function getAuctions() {
  let auctions;
  try {
    auctions = await listAuctions(mapper);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(auctions),
  };
}

export const handler = getAuctions;
