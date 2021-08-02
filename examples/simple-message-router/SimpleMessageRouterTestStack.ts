import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { UnitTestStack } from '../../src';
import SimpleMessageRouterConstruct from './SimpleMessageRouterConstruct';

export default class SimpleMessageRouterTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = 'SimpleRouterTestStack';

  static readonly TestInputQueueId = 'TestInputQueue';

  static readonly PositiveOutputQueueObserverId = 'PositiveOutputQueueObserverFunction';

  static readonly NegativeOutputQueueObserverId = 'NegativeOutputQueueObserverFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: SimpleMessageRouterTestStack.ResourceTagKey,
      observerIds: [
        SimpleMessageRouterTestStack.PositiveOutputQueueObserverId,
        SimpleMessageRouterTestStack.NegativeOutputQueueObserverId,
      ],
    });

    const testInputQueue = new sqs.Queue(this, SimpleMessageRouterTestStack.TestInputQueueId, {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    this.addTestResourceTag(testInputQueue, SimpleMessageRouterTestStack.TestInputQueueId);

    const sut = new SimpleMessageRouterConstruct(this, 'SimpleMessageRouter', {
      inputQueue: testInputQueue,
    });

    this.addMessageConsumer(
      sut.positiveOutputQueue,
      SimpleMessageRouterTestStack.PositiveOutputQueueObserverId
    );

    this.addMessageConsumer(
      sut.negativeOutputQueue,
      SimpleMessageRouterTestStack.NegativeOutputQueueObserverId
    );
  }
}
