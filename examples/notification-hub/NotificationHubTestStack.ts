import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';
import { IntegrationTestStack } from '../../src';
import NotificationHub from './NotificationHub';
import { CaseEventType } from './ExternalContracts';

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

    // Bus observer rules

    this.addEventBridgeRuleTargetFunction(
      'SourceRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        source: [`lender.${NotificationHubTestStack.TestLenderId}`],
      }
    );

    // https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html
    
    const testEventPattern = {
      source: ['test.event-pattern'],
    };

    this.addEventBridgeRuleTargetFunction(
      'EqualRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detail: {
          lenderId: ['LenderA'],
        },
      },
      events.RuleTargetInput.fromText('EQUAL')
    );

    this.addEventBridgeRuleTargetFunction(
      'AndRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detail: {
          lenderId: ['LenderA'],
          distributorId: ['DistributorX'],
        },
      },
      events.RuleTargetInput.fromText('AND')
    );

    this.addEventBridgeRuleTargetFunction(
      'OrRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detail: {
          lenderId: ['LenderA', 'LenderB'],
        },
      },
      events.RuleTargetInput.fromText('OR')
    );

    this.addEventBridgeRuleTargetFunction(
      'AnythingButRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detail: {
          lenderId: [{ 'anything-but': ['LenderA'] }],
        },
      },
      events.RuleTargetInput.fromText('ANYTHING-BUT')
    );

    this.addEventBridgeRuleTargetFunction(
      'BeginsWithRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detail: {
          // Event pattern is not valid. Reason: prefix match pattern must be a string
          // lenderId: [{ prefix: ['lender'] }],
          lenderId: [{ prefix: 'Lender' }],
        },
      },
      events.RuleTargetInput.fromText('BEGINS-WITH')
    );

    this.addEventBridgeRuleTargetFunction(
      'ExistsRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detailType: [CaseEventType.CaseStatusUpdated],
        detail: {
          oldStatus: [{ exists: true }],
        },
      },
      events.RuleTargetInput.fromText('EXISTS')
    );

    this.addEventBridgeRuleTargetFunction(
      'NumericEqualRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detailType: [CaseEventType.CasePaymentRequiredEvent],
        detail: {
          total: [{ numeric: ['=', 0] }],
        },
      },
      events.RuleTargetInput.fromText('NUMERIC-EQUAL')
    );

    this.addEventBridgeRuleTargetFunction(
      'NumericRangeRule',
      sut.eventBus,
      NotificationHubTestStack.BusObserverFunctionId,
      {
        ...testEventPattern,
        detailType: [CaseEventType.CasePaymentRequiredEvent],
        detail: {
          // total: [{ numeric: ['>', 0, '≤', 100] }], // TODO 24Aug21: Is ≤ correct?
          total: [{ numeric: ['>', 0, '<=', 100] }],
        },
      },
      events.RuleTargetInput.fromText('NUMERIC-RANGE')
    );
  }
}
