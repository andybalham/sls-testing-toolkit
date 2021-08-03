import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface UnitTestStackProps {
  testResourceTagKey: string;
  unitTestTable?: boolean;
  observerIds?: string[];
  mockIds?: string[];
}

export default abstract class UnitTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly UnitTestTableId = 'UnitTestTable';

  readonly unitTestTable: dynamodb.Table;

  readonly testFunctions: Record<string, lambda.IFunction>;

  constructor(scope: cdk.Construct, id: string, props: UnitTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    if (
      props.unitTestTable ||
      (props.observerIds?.length ?? 0) > 0 ||
      (props.mockIds?.length ?? 0) > 0
    ) {
      //
      // Test table

      this.unitTestTable = new dynamodb.Table(this, UnitTestStack.UnitTestTableId, {
        partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
        sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      });

      this.addTestResourceTag(this.unitTestTable, UnitTestStack.UnitTestTableId);
    }

    this.testFunctions = {};

    if (props.observerIds) {
      props.observerIds
        .map((i) => ({ observerId: i, function: this.newObserverFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.observerId] = iaf.function;
        });
    }

    if (props.mockIds) {
      props.mockIds
        .map((i) => ({ mockId: i, function: this.newMockFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.mockId] = iaf.function;
        });
    }
  }

  addTestResourceTag(resource: cdk.IConstruct, resourceId: string): void {
    cdk.Tags.of(resource).add(this.testResourceTagKey, resourceId);
  }

  addMessageConsumer(queue: sqs.IQueue, testFunctionId: string): void {
    //
    const queueObserverFunction = this.testFunctions[testFunctionId];

    queue.grantConsumeMessages(queueObserverFunction);
    queueObserverFunction.addEventSource(new lambdaEventSources.SqsEventSource(queue));
  }

  addEventSubscriber(topic: sns.ITopic, testFunctionId: string): void {
    //
    const topicObserverFunction = this.testFunctions[testFunctionId];

    topic.addSubscription(new snsSubs.LambdaSubscription(topicObserverFunction));
  }

  private newObserverFunction(observerId: string): lambda.IFunction {
    //
    if (this.unitTestTable === undefined) throw new Error('this.unitTestTable === undefined');

    const functionEntryBase = path.join(__dirname, '.');

    const observerFunction = new lambdaNodejs.NodejsFunction(
      this,
      `ObserverFunction-${observerId}`,
      {
        runtime: lambda.Runtime.NODEJS_14_X,
        entry: path.join(functionEntryBase, `observerFunction.ts`),
        handler: 'handler',
        environment: {
          OBSERVER_ID: observerId,
          UNIT_TEST_TABLE_NAME: this.unitTestTable.tableName,
        },
      }
    );

    this.addTestResourceTag(observerFunction, observerId);

    this.unitTestTable.grantReadWriteData(observerFunction);

    return observerFunction;
  }

  private newMockFunction(mockId: string): lambda.IFunction {
    //
    const functionEntryBase = path.join(__dirname, '.');

    const mockFunction = new lambdaNodejs.NodejsFunction(this, `MockFunction-${mockId}`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(functionEntryBase, `mockFunction.ts`),
      handler: 'handler',
      environment: {
        MOCK_ID: mockId,
        UNIT_TEST_TABLE_NAME: this.unitTestTable.tableName,
      },
    });

    this.addTestResourceTag(mockFunction, mockId);

    this.unitTestTable.grantReadWriteData(mockFunction);

    return mockFunction;
  }
}
