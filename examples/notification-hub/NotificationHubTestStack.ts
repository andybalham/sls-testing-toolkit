import * as cdk from '@aws-cdk/core';
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

    this.addEventBridgeRuleTarget(sut.eventBus, NotificationHubTestStack.BusObserverFunctionId, {
      source: [`lender.${NotificationHubTestStack.TestLenderId}`],
    });
  }
}
