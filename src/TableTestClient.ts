// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
import { clearAllItems, getItem } from './dynamoDb';

export default class BucketTestClient {
  //
  constructor(private region: string, private tableName: string) {}

  async clearAllItemsAsync(): Promise<void> {
    await clearAllItems(this.region, this.tableName);
  }

  async getItemAsync<T>(key: Record<string, any> | undefined): Promise<T | undefined> {
    //
    if (key === undefined) {
      return undefined;
    }

    return getItem(this.region, this.tableName, key) as unknown as T;
  }

  async getItemByEventKeyAsync<T>(
    eventKey: { [key: string]: AWS.DynamoDB.AttributeValue } | undefined
  ): Promise<T | undefined> {
    //
    if (eventKey === undefined) {
      return undefined;
    }

    const key = AWS.DynamoDB.Converter.unmarshall(eventKey);

    return getItem(this.region, this.tableName, key) as unknown as T;
  }
}
