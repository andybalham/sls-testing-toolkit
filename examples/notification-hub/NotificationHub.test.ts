/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SNSEventRecord } from 'aws-lambda/trigger/sns';
import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import { expect } from 'chai';
import { EventBridgeTestClient, IntegrationTestClient, TestObservation } from '../../src';
import { EventType, LenderEvent } from './ExternalContracts';
import NotificationHubConstruct from './NotificationHubConstruct';
import NotificationHubTestStack from './NotificationHubTestStack';

describe('NotificationHub Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: NotificationHubTestStack.Id,
  });

  let notificationHubEventBus: EventBridgeTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    notificationHubEventBus = testClient.getEventBridgeTestClient(
      NotificationHubConstruct.NotificationHubEventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('test events routed to bus observer', async () => {
    // Arrange

    const lenderEvent: LenderEvent = {
      lenderId: 'honest-john',
      message: 'Your loan has been approved',
    };

    const eventRequest: PutEventsRequestEntry = {
      Source: 'test',
      DetailType: EventType.Lender,
      Detail: JSON.stringify(lenderEvent),
    };

    // Act

    await notificationHubEventBus.putEventAsync(eventRequest);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const snsEventRecords = TestObservation.getEventRecords<SNSEventRecord>(observations);

    const busEvent = JSON.parse(snsEventRecords[0].Sns.Message);

    expect(busEvent.detail).to.deep.equal(lenderEvent);
  });
});
