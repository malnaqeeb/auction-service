const { DynamoDbTable, DynamoDbSchema } = require('@aws/dynamodb-data-mapper');
import DynamoDB from 'aws-sdk/clients/dynamodb';
const { DataMapper } = require('@aws/dynamodb-data-mapper');

export class Auction {
  constructor(data = {}) {
    Object.assign(this, data);
  }

  get [DynamoDbTable]() {
    return process.env.DEV_AUCTIONS_TABLE_NAME;
  }

  get [DynamoDbSchema]() {
    return {
      id: {
        type: 'String',
        keyType: 'HASH',
      },
      status: { type: 'String' },
      endingAt: {
        type: 'String',
      },
      createdAt: {
        type: 'String',
      },
      highestBid: {
        type: 'Hash',
      },
      seller: {
        type: 'String',
      },
      title: {
        type: 'String',
      },
    };
  }
}

const client = new DynamoDB({ region: 'eu-west-1' });
export const mapper = new DataMapper({
  client,
});
