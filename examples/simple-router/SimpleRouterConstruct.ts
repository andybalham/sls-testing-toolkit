import * as cdk from '@aws-cdk/core';
// eslint-disable-next-line import/no-extraneous-dependencies
import * as sqs from '@aws-cdk/aws-sqs';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface SimpleRouterProps {
  inputQueue: sqs.IQueue;
}

export default class SimpleRouterConstruct extends cdk.Construct {
  //
  static readonly PositiveOutputQueueId = 'PositiveOutputQueue';

  readonly positiveOutputQueue: sqs.IQueue;

  static readonly NegativeOutputQueueId = 'NegativeOutputQueue';

  readonly negativeOutputQueue: sqs.IQueue;

  constructor(scope: cdk.Construct, id: string, props: SimpleRouterProps) {
    super(scope, id);

    const outputQueueProps = {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    };
    
    this.positiveOutputQueue = new sqs.Queue(
      this,
      SimpleRouterConstruct.PositiveOutputQueueId,
      outputQueueProps
    );

    this.negativeOutputQueue = new sqs.Queue(
      this,
      SimpleRouterConstruct.NegativeOutputQueueId,
      outputQueueProps
    );

    const simpleRouterFunction = new lambdaNodejs.NodejsFunction(scope, 'SimpleRouterFunction', {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(__dirname, '.', 'simpleRouter.ts'),
      handler: 'handler',
      environment: {
        INPUT_QUEUE_URL: props.inputQueue.queueUrl,
        POSITIVE_OUTPUT_QUEUE_URL: this.positiveOutputQueue.queueUrl,
        NEGATIVE_OUTPUT_QUEUE_URL: this.negativeOutputQueue.queueUrl,
      },
    });

    props.inputQueue.grantConsumeMessages(simpleRouterFunction);
    this.positiveOutputQueue.grantSendMessages(simpleRouterFunction);
    this.negativeOutputQueue.grantSendMessages(simpleRouterFunction);
  }
}
