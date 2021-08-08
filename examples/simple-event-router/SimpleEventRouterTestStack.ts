import * as cdk from '@aws-cdk/core';
import * as sns from '@aws-cdk/aws-sns';
import { UnitTestStack } from '../../src';
import SimpleEventRouterConstruct from './SimpleEventRouterConstruct';

export default class SimpleEventRouterTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = `SimpleEventRouterTestStack${
    process.env.TEST_STACK_SCOPE ?? ''
  }`;

  static readonly TestInputTopicId = 'TestInputTopic';

  static readonly PositiveOutputTopicSubscriberId = 'PositiveOutputTopicSubscriberFunction';

  static readonly NegativeOutputTopicSubscriberId = 'NegativeOutputTopicSubscriberFunction';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: SimpleEventRouterTestStack.ResourceTagKey,
      testFunctionIds: [
        SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId,
        SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId,
      ],
    });

    const testInputTopic = new sns.Topic(this, SimpleEventRouterTestStack.TestInputTopicId);

    this.addTestResourceTag(testInputTopic, SimpleEventRouterTestStack.TestInputTopicId);

    const sut = new SimpleEventRouterConstruct(this, 'SUT', {
      inputTopic: testInputTopic,
    });

    this.addEventSubscriber(
      sut.positiveOutputTopic,
      SimpleEventRouterTestStack.PositiveOutputTopicSubscriberId
    );

    this.addEventSubscriber(
      sut.negativeOutputTopic,
      SimpleEventRouterTestStack.NegativeOutputTopicSubscriberId
    );
  }
}
