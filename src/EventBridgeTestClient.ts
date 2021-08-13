/* eslint-disable import/no-extraneous-dependencies */
import AWS from 'aws-sdk';
import {
  PutEventsRequest,
  PutEventsRequestEntry,
  PutEventsResponse,
} from 'aws-sdk/clients/eventbridge';

export default class EventBridgeTestClient {
  //
  readonly eventBridge: AWS.EventBridge;

  constructor(region: string, private eventBusArn: string) {
    this.eventBridge = new AWS.EventBridge({ region });
  }

  async putEventAsync(entry: PutEventsRequestEntry): Promise<PutEventsResponse> {
    return this.putEventsAsync([entry]);
  }

  async putEventsAsync(entries: PutEventsRequestEntry[]): Promise<PutEventsResponse> {
    //
    const putEventsRequest: PutEventsRequest = {
      Entries: entries.map((e) => ({
        ...e,
        EventBusName: this.eventBusArn,
      })),
    };

    return this.eventBridge.putEvents(putEventsRequest).promise();
  }
}
