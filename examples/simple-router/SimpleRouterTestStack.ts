import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { UnitTestStack } from '../../src';
import SimpleRouterConstruct from './SimpleRouterConstruct';

export default class SimpleRouterTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = 'SimpleRouterTestStack';

  static readonly TestInputQueueId = 'TestInputQueue';

  static readonly PositiveOutputQueueObserverId = 'PositiveOutputQueueObserverFunction';

  static readonly NegativeOutputQueueObserverId = 'NegativeOutputQueueObserverFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: SimpleRouterTestStack.ResourceTagKey,
      observerIds: [
        SimpleRouterTestStack.PositiveOutputQueueObserverId,
        SimpleRouterTestStack.NegativeOutputQueueObserverId,
      ],
    });

    const testInputQueue = new sqs.Queue(this, SimpleRouterTestStack.TestInputQueueId, {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    this.addTestResourceTag(testInputQueue, SimpleRouterTestStack.TestInputQueueId);

    const sut = new SimpleRouterConstruct(this, 'SimpleRouter', {
      inputQueue: testInputQueue,
    });

    this.addMessageConsumer(
      sut.positiveOutputQueue,
      SimpleRouterTestStack.PositiveOutputQueueObserverId
    );

    this.addMessageConsumer(
      sut.negativeOutputQueue,
      SimpleRouterTestStack.NegativeOutputQueueObserverId
    );
  }
}
