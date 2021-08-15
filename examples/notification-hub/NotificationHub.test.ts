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

  it.skip('https://webhook.site/#!/b0de1914-3782-410f-900e-a53090f811ba', async () => {
    // https://webhook.site/b0de1914-3782-410f-900e-a53090f811ba

    // Rule

    // await notificationHubEventBus.eventBridge.putRule({}).promise();

    const createConnectionResponse = await notificationHubEventBus.eventBridge
      .createConnection({
        Name: 'TestConnection',
        AuthorizationType: 'API_KEY',
        AuthParameters: {
          ApiKeyAuthParameters: {
            ApiKeyName: 'x-api-key',
            ApiKeyValue: 'test-api-key-value',
          },
        },
      })
      .promise();

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ createConnectionResponse }, null, 2));

    // API destination

    // await notificationHubEventBus.eventBridge.createApiDestination({}).promise();

    // Target

    const eventBusName = 'TODO';
    const ruleName = 'TODO';
    const apiDestinationArn = 'TODO';

    await notificationHubEventBus.eventBridge
      .putTargets({
        EventBusName: eventBusName,
        Rule: ruleName,
        Targets: [
          {
            Arn: apiDestinationArn,
            Id: 'TODO',
            RoleArn: 'Is this where we need to reference a role with the policy below?',
          },
        ],
      })
      .promise();

    // TODO 15Aug21: What needs the policy below? The Rule?
    // Create a role with the following policy
    // EventBridge needs permission to invoke API destinations. By continuing, you are allowing us to do so.

    /*
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "events:InvokeApiDestination"
            ],
            "Resource": [
                "arn:aws:events:eu-west-2:361728023653:api-destination/WebhookSiteTarget/*"
            ]
        }
    ]
}
      */
  });
});
