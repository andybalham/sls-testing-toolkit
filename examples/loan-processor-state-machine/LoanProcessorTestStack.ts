/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import { UnitTestStack } from '../../src';
import LoanProcessorStateMachine from './LoanProcessorStateMachine';
import writeGraphJson from './writeGraphJson';

export default class LoanProcessorTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = 'LoanProcessorTestStack';

  static readonly CreditRatingFunctionId = 'CreditRatingFunction';

  static readonly ErrorQueueId = 'ErrorQueue';

  static readonly ErrorQueueConsumerId = 'ErrorQueueConsumer';

  static readonly LoanProcessorStateMachineId = 'LoanProcessorStateMachine';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: LoanProcessorTestStack.ResourceTagKey,
      testFunctionIds: [
        LoanProcessorTestStack.CreditRatingFunctionId,
        LoanProcessorTestStack.ErrorQueueConsumerId,
      ],
    });

    // Error queue and consumer

    const errorQueue = new sqs.Queue(this, 'ErrorQueue', {
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      visibilityTimeout: cdk.Duration.seconds(3),
    });

    this.addMessageConsumer(
      errorQueue,
      LoanProcessorTestStack.ErrorQueueConsumerId
    );

    // SUT

    const sut = new LoanProcessorStateMachine(
      this,
      LoanProcessorTestStack.LoanProcessorStateMachineId,
      {
        creditRatingFunction: this.testFunctions[LoanProcessorTestStack.CreditRatingFunctionId],
        errorQueue
      }
    );

    this.addTestResourceTag(sut, LoanProcessorTestStack.LoanProcessorStateMachineId);

    writeGraphJson(sut);
  }
}
