/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import { UnitTestStack } from '../../src';
import LoanProcessorStateMachine from './LoanProcessorStateMachine';
import writeGraphJson from './writeGraphJson';

export default class LoanProcessorTestStack extends UnitTestStack {
  //
  static readonly ResourceTagKey = 'LoanProcessorTestStack';

  static readonly CreditRatingFunctionId = 'CreditRatingFunctionId';

  static readonly SendErrorMessageFunctionId = 'SendErrorMessageFunctionId';

  static readonly SutId = 'SutId';

  constructor(scope: cdk.Construct, id: string) {
    //
    super(scope, id, {
      testResourceTagKey: LoanProcessorTestStack.ResourceTagKey,
      testFunctionIds: [
        LoanProcessorTestStack.CreditRatingFunctionId,
        LoanProcessorTestStack.SendErrorMessageFunctionId,
      ],
    });

    const sut = new LoanProcessorStateMachine(this, 'LoanProcessorStateMachine', {
      creditRatingFunction: this.testFunctions[LoanProcessorTestStack.CreditRatingFunctionId],
      sendErrorMessageFunction:
        this.testFunctions[LoanProcessorTestStack.SendErrorMessageFunctionId],
    });

    this.addTestResourceTag(sut, LoanProcessorTestStack.SutId);

    // Output the graph JSON to help with development

    writeGraphJson(sut);
  }
}
