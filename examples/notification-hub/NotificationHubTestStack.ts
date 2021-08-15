import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import * as eventsTargets from '@aws-cdk/aws-events-targets';
import * as sns from '@aws-cdk/aws-sns';
import { IntegrationTestStack } from '../../src';
import NotificationHub from './NotificationHub';

export default class NotificationHubTestStack extends IntegrationTestStack {
  //
  static readonly Id = `NotificationHubTestStack`;

  static readonly BusObserverFunctionId = 'BusObserverFunction';

  static readonly PublishCaseEventFunctionId = 'PublishCaseEventFunction';

  static readonly TestLenderId = 'test-lender-id';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testStackId: NotificationHubTestStack.Id,
      testFunctionIds: [NotificationHubTestStack.BusObserverFunctionId],
    });

    // SUT

    const sut = new NotificationHub(this, 'SUT');

    // 14Aug21: This currently has no effect, as you can't add tags to event buses at the time of writing
    this.addTestResourceTag(sut.eventBus, NotificationHub.NotificationHubEventBusId);

    this.addTestResourceTag(
      sut.publishCaseEventFunction,
      NotificationHubTestStack.PublishCaseEventFunctionId
    );

    // Bus observer function

    const busObserverTopic = new sns.Topic(this, 'BusObserverTopic');

    this.addEventSubscriber(busObserverTopic, NotificationHubTestStack.BusObserverFunctionId);

    const busObserverRule = new events.Rule(this, 'BusObserverRule', {
      eventBus: sut.eventBus,
      eventPattern: {
        source: [`lender.${NotificationHubTestStack.TestLenderId}`],
      },
    });

    busObserverRule.addTarget(new eventsTargets.SnsTopic(busObserverTopic));
  }
}
