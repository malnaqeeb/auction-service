import createError from 'http-errors';
const { getAuctionById } = require('../repositories/auction');
const { mapper } = require('../repositories/mapper');
export async function getAuction(event, context) {
  const { id } = event.pathParameters;
  let auction;
  try {
    auction = await getAuctionById(mapper, id);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found!`);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(auction),
  };
}

export const handler = getAuction;
