/* eslint-disable import/no-extraneous-dependencies */
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';
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
  acceptTable?: dynamodb.ITable;
  declineTopic?: sns.ITopic;
  errorQueue: sqs.IQueue;
}

const functionEntry = path.join(__dirname, '.', 'stateMachineFunctions.ts');

export default class LoanProcessorStateMachine extends StateMachineWithGraph {
  //
  static readonly CreditRatingMaxAttempts = 2;

  static readonly CreditRatingErrorSource = 'CreditRating';

  constructor(scope: cdk.Construct, id: string, props: LoanProcessorStateMachineProps) {
    super(scope, id, {
      ...props,
      getDefinition: (definitionScope: cdk.Construct): sfn.IChainable =>
        StateMachineBuilder.new()

          .lambdaInvoke('GetCreditRating', {
            lambdaFunction: props.creditRatingFunction,
            parameters: {
              'firstName.$': '$.loanDetails.firstName',
              'lastName.$': '$.loanDetails.lastName',
              'postcode.$': '$.loanDetails.postcode',
            },
            resultPath: '$.creditRating',
            retry: {
              maxAttempts: LoanProcessorStateMachine.CreditRatingMaxAttempts,
            },
            catches: [{ handler: 'HandleCreditRatingError' }],
          })

          .end()

          .pass('HandleCreditRatingError', {
            result: sfn.Result.fromString(LoanProcessorStateMachine.CreditRatingErrorSource),
            resultPath: '$.Source',
          })

          .lambdaInvoke('ExtractErrorCause', {
            lambdaFunction: new lambdaNodejs.NodejsFunction(
              definitionScope,
              `ExtractErrorCauseFunction`,
              {
                runtime: lambda.Runtime.NODEJS_14_X,
                entry: functionEntry,
                handler: 'extractErrorClauseHandler',
              }
            ),
            resultPath: '$.Cause',
          })

          .perform(
            new sfnTasks.SqsSendMessage(definitionScope, 'SendErrorMessage', {
              queue: props.errorQueue,
              messageBody: sfn.TaskInput.fromObject({
                'Source.$': '$.Source',
                'Cause.$': '$.Cause',
              }),
            })
          )

          .fail('CreditRatingFail', {
            cause: LoanProcessorStateMachine.CreditRatingErrorSource,
          })

          .build(definitionScope, {
            defaultProps: {
              lambdaInvoke: {
                payloadResponseOnly: true,
                retryOnServiceExceptions: false,
              },
            },
          }),
    });
  }
}
