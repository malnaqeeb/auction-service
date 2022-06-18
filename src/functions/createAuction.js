import { v4 as uuid } from 'uuid';
import createError from 'http-errors';
const { mapper } = require('../repositories/mapper');
import { makeAuction } from '../repositories/auction';

async function createAuction(event, context) {
  const { title, email } = JSON.parse(event.body);
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);
  //tet

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    },
    seller: email,
  };
  let createdAuction;
  try {
    createdAuction = await makeAuction(mapper, auction);
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return {
    statusCode: 201,
    body: JSON.stringify(createdAuction),
  };
}

export const handler = createAuction;
