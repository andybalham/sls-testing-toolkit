import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import { EventBridgeTestClient, IntegrationTestClient } from '../../src';
import { EventType, LenderEvent } from './ExternalContracts';
import NotificationHubConstruct from './NotificationHubConstruct';
import NotificationHubTestStack from './NotificationHubTestStack';

describe('NotificationHub Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testResourceTagKey: NotificationHubTestStack.TestResourceTagKey,
  });

  let notificationHubEventBus: EventBridgeTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    notificationHubEventBus = testClient.getEventBridgeTestClient(
      NotificationHubConstruct.EventBusId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('routes to unfiltered subscriber', async () => {
    // Arrange

    const lenderEvent: LenderEvent = {
      lenderId: 'honest-john',
      message: 'Your loan has been approved',
    };

    const eventRequest: PutEventsRequestEntry = {
      Source: 'test.unfiltered-subscriber',
      DetailType: EventType.Lender,
      Detail: JSON.stringify(lenderEvent),
    };

    // Act

    await notificationHubEventBus.putEventAsync(eventRequest);

    // Await

    // TODO 13Aug21: What are we awaiting?

    // Assert

    // TODO 13Aug21: What are we asserting?
  });
});
