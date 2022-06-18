import createError from 'http-errors';
const { closeAuctions } = require('../repositories/auction');
const { mapper } = require('../repositories/mapper');
export async function closeAuction(auction) {
  let closedAuction;
  try {
    closedAuction = await closeAuctions(mapper, auction);
  } catch (error) {
    throw new createError.InternalServerError(error);
  }
  return closedAuction;
}
