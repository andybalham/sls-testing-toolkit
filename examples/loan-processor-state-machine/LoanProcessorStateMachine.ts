/* eslint-disable import/no-extraneous-dependencies */
import StateMachineBuilder from '@andybalham/state-machine-builder';
import StateMachineWithGraph from '@andybalham/state-machine-with-graph';
import * as cdk from '@aws-cdk/core';
import * as sfn from '@aws-cdk/aws-stepfunctions';
import * as sfnTasks from '@aws-cdk/aws-stepfunctions-tasks';
import * as lambda from '@aws-cdk/aws-lambda';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as sns from '@aws-cdk/aws-sns';
import * as sqs from '@aws-cdk/aws-sqs';

export interface LoanProcessorStateMachineProps extends Omit<sfn.StateMachineProps, 'definition'> {
  creditRatingFunction: lambda.IFunction;
  acceptTable: dynamodb.ITable;
  declineTopic: sns.ITopic;
  errorQueue: sqs.IQueue;
}

export default class LoanProcessorStateMachine extends StateMachineWithGraph {
  //
  constructor(scope: cdk.Construct, id: string, props: LoanProcessorStateMachineProps) {
    super(scope, id, {
      ...props,
      getDefinition: (definitionScope: cdk.Construct): sfn.IChainable =>
        StateMachineBuilder.new()

          .lambdaInvoke('GetCreditRating', {
            lambdaFunction: props.creditRatingFunction,
            parameters: {
              'loanDetails.firstName.$': '$.loanDetails.firstName',
              'loanDetails.lastName.$': '$.loanDetails.lastName',
              'loanDetails.postcode.$': '$.loanDetails.postcode',
            },
            resultPath: '$.creditRating',
            retry: {
              maxAttempts: 2,
            },
            catches: [{ handler: 'CreditRatingError' }],
          })

          .end()

          .perform(
            new sfnTasks.SqsSendMessage(definitionScope, 'SendErrorMessage', {
              queue: props.errorQueue,
              messageBody: sfn.TaskInput.fromObject({
                message: 'Credit rating error', // TODO 05Aug21: What details are available here?
              }),
            })
          )

          .build(definitionScope, {
            defaultProps: {
              lambdaInvoke: {
                payloadResponseOnly: true,
              },
            },
          }),
    });
  }
}
