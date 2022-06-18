import { Auction } from './mapper';
import createError from 'http-errors';
import {
  greaterThan,
  equals,
  lessThanOrEqualTo,
} from '@aws/dynamodb-expressions';
export const makeAuction = async (db, data) => {
  let createdAuction;
  try {
    createdAuction = await db.put(new Auction(data));
  } catch (error) {
    createError.InternalServerError('Error while creating auctions');
  }
  return createdAuction;
};

export const getAuctionById = async (db, id) => {
  let auction;
  try {
    auction = await db.get(new Auction({ id }));
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  if (!auction) {
    throw new createError.NotFound(`Auction with ID "${id}" not found!`);
  }

  return auction;
};

export const listAuctions = async (db) => {
  let auctions = [];
  try {
    const iterator = db.scan(Auction, {
      limit: 100,
      readConsistency: 'eventual',
    });
    for await (const item of iterator) {
      auctions.push(item);
    }
  } catch (error) {
    createError.InternalServerError('Error while listing auctions');
  }
  return auctions;
};

export const makePlaceBid = async (db, id, amount, email, auction) => {
  const data = {
    id,
    highestBid: {
      amount,
      bidder: email,
    },
  };
  // check if the bid greater than current bid
  const amountGreaterThanPredicate = greaterThan(auction.amount);
  const amountGreaterThan = {
    ...amountGreaterThanPredicate,
    subject: 'highestBid.amount',
  };
  // check if id is equal
  const equalsIdPredicate = equals(id);
  const equalsId = {
    ...equalsIdPredicate,
    subject: 'id',
  };
  // Apply and expression
  const amountAndId = {
    type: 'And',
    condition: [amountGreaterThan, equalsId],
  };
  let updatedAuction;

  try {
    const result = await db.update(new Auction(data), {
      conditions: amountAndId,
      onMissing: 'skip',
      returnValues: 'ALL_NEW',
    });
    updatedAuction = result;
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }

  return updatedAuction;
};

export const closeAuctions = async (db, auction) => {
  const data = {
    ...auction,
    status: 'CLOSED',
  };
  const { id } = auction;
  let closedAuction;
  try {
    closedAuction = await db.update(new Auction(data), {
      condition: {
        type: 'Equals',
        object: id,
        subject: 'id',
      },
      onMissing: 'skip',
    });
  } catch (error) {
    console.error(error);
    createError.InternalServerError('Error while close auction');
  }
  return closedAuction;
};

export const endedAuctions = async (db, status) => {
  // query the auctions that has status OPEN and expired
  // endingAt: specified to be expired after one hour of creation

  // const statusAndEndingAt = {
  //   status: 'OPEN',
  //   endingAt: lessThanOrEqualTo(now.toISOString()),
  // };

  // check if the auction is expired
  const expiredExpression = {
    ...lessThanOrEqualTo(new Date().toISOString()),
    subject: 'endingAt',
  };

  // check if the status is 'OPEN'
  const statusExpression = {
    ...equals('CLOSED'),
    subject: 'status',
  };

  // apply condition
  const statusAndEndingAt = {
    type: 'And',
    conditions: [statusExpression, expiredExpression],
  };

  const options = {
    indexName: 'statusAndEndDate',
    limit: 50,
  };

  let auctions;
  try {
    const paginator = db.query(Auction, statusExpression, options).pages();
    console.log(paginator);
    for await (const page of paginator) {
      auctions = page;
    }
  } catch (error) {
    console.error(error);
    createError.InternalServerError('Error while query');
  }
  return auctions;
};
