/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SNSEvent, SNSEventRecord } from 'aws-lambda/trigger/sns';
import { PutEventsRequestEntry } from 'aws-sdk/clients/eventbridge';
import { expect } from 'chai';
import {
  EventBridgeTestClient,
  IntegrationTestClient,
  LambdaTestClient,
  TestObservation,
} from '../../src';
import { CaseEventType, CaseStatus, CaseStatusUpdatedEvent } from './ExternalContracts';
import NotificationHub from './NotificationHub';
import NotificationHubTestStack from './NotificationHubTestStack';

describe('NotificationHub Tests', () => {
  //
  const testClient = new IntegrationTestClient({
    testStackId: NotificationHubTestStack.Id,
  });

  let notificationHubEventBus: EventBridgeTestClient;
  let publishCaseEventFunction: LambdaTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    notificationHubEventBus = testClient.getEventBridgeTestClient(
      NotificationHub.NotificationHubEventBusId
    );
    publishCaseEventFunction = testClient.getLambdaTestClient(
      NotificationHubTestStack.PublishCaseEventFunctionId
    );
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('handles events published directly to event bus', async () => {
    // Arrange

    const caseEvent: CaseStatusUpdatedEvent = {
      eventType: CaseEventType.CaseStatusUpdated,
      lenderId: NotificationHubTestStack.TestLenderId,
      distributorId: 'test-distributor-id',
      caseId: 'C1234',
      oldStatus: CaseStatus.Referred,
      newStatus: CaseStatus.Accepted,
      statusChangedDate: '2021-08-15',
    };

    const eventRequest: PutEventsRequestEntry = {
      Source: `lender.${caseEvent.lenderId}`,
      DetailType: caseEvent.eventType,
      Detail: JSON.stringify(caseEvent),
    };

    // Act

    await notificationHubEventBus.putEventAsync(eventRequest);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const snsEventRecords = TestObservation.getEventRecords<SNSEvent, SNSEventRecord>(observations);

    expect(snsEventRecords.length).to.be.greaterThan(0);

    const busEvent = JSON.parse(snsEventRecords[0].Sns.Message);

    expect(busEvent.detail).to.deep.equal(caseEvent);
  });

  it('handles events published via function', async () => {
    // Arrange

    const caseEvent: CaseStatusUpdatedEvent = {
      eventType: CaseEventType.CaseStatusUpdated,
      lenderId: NotificationHubTestStack.TestLenderId,
      distributorId: 'test-distributor-id',
      caseId: 'C1234',
      oldStatus: CaseStatus.Referred,
      newStatus: CaseStatus.Accepted,
      statusChangedDate: '2021-08-15',
    };

    // Act

    await publishCaseEventFunction.invokeAsync(caseEvent);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const snsEventRecords = TestObservation.getEventRecords<SNSEvent, SNSEventRecord>(observations);

    expect(snsEventRecords.length).to.be.greaterThan(0);

    const busEvent = JSON.parse(snsEventRecords[0].Sns.Message);

    expect(busEvent.detail).to.deep.equal(caseEvent);
  });
});
