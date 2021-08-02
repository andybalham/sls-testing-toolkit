import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { UnitTestStack } from '../../src';
import SimpleEventRouterConstruct from './SimpleEventRouterConstruct';

export default class SimpleEventRouterTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = 'SimpleEventRouterTestStack';

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly PositiveOutputTopicObserverId = 'PositiveOutputTopicObserverFunction';

  static readonly NegativeOutputTopicObserverId = 'NegativeOutputTopicObserverFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: SimpleEventRouterTestStack.ResourceTagKey,
      observerIds: [
        SimpleEventRouterTestStack.PositiveOutputTopicObserverId,
        SimpleEventRouterTestStack.NegativeOutputTopicObserverId,
      ],
    });

    const testInputTopic = new sns.Topic(this, SimpleEventRouterTestStack.TestInputTopicId);

    this.addTestResourceTag(testInputTopic, SimpleEventRouterTestStack.TestInputTopicId);

    const sut = new SimpleEventRouterConstruct(this, 'SimpleEventRouter', {
      inputTopic: testInputTopic,
    });

    this.addEventSubscriber(
      sut.positiveOutputTopic,
      SimpleEventRouterTestStack.PositiveOutputTopicObserverId
    );

    this.addEventSubscriber(
      sut.negativeOutputTopic,
      SimpleEventRouterTestStack.NegativeOutputTopicObserverId
    );
  }
}
