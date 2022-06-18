import createError from 'http-errors';

const { getAuctionById, makePlaceBid } = require('../repositories/auction');
const { mapper } = require('../repositories/mapper');

async function placeBid(event, context) {
  const { id } = event.pathParameters;
  const { amount, email } = JSON.parse(event.body);
  const auction = await getAuctionById(mapper, id);

  // Bid identity validation
  if (email === auction.seller) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        msg: 'You cannot bid on your own auctions!',
      }),
    };
  }
  // Avoid double bidding
  if (email === auction.highestBid.bidder) {
    console.log(
      'email === auction.highestBid.bidder',
      email,
      auction.highestBid.bidder
    );
    return {
      statusCode: 403,
      body: JSON.stringify({
        msg: `You are already the highest bidder`,
      }),
    };
  }

  // Auction status validation
  if (auction.status !== 'OPEN') {
    return {
      statusCode: 403,
      body: JSON.stringify({
        msg: `You cannot bid on closed auctions!`,
      }),
    };
  }

  // Bid amount validation
  if (amount <= auction.highestBid.amount) {
    return {
      statusCode: 403,
      body: JSON.stringify({
        msg: `Your bid must be higher than ${auction.highestBid.amount}!`,
      }),
    };
  }
  let updatedAuction;

  try {
    const result = await makePlaceBid(mapper, id, amount, email, auction);
    updatedAuction = result;
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 200,
    body: JSON.stringify(updatedAuction),
  };
}

export const handler = placeBid;
