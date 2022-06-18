import AWS from 'aws-sdk';
const { mapper } = require('../repositories/mapper');
import { endedAuctions } from '../repositories/auction';
const dynamodb = new AWS.DynamoDB.DocumentClient();

export async function getEndedAuctions() {
  const result = await endedAuctions(mapper);
  return result;
}
