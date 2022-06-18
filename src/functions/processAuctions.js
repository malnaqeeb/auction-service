import createError from 'http-errors';
import { getEndedAuctions } from '../helpers/getEndedAuctions';
import { closeAuction } from '../helpers/closeAuction';

async function processAuctions(event, context) {
  let result;
  try {
    const auctionsToClose = await getEndedAuctions();

    const closePromises = auctionsToClose.map((auction) =>
      closeAuction(auction)
    );
    result = await Promise.all(closePromises);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}

export const handler = processAuctions;
