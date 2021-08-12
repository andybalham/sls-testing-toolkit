import * as cdk from '@aws-cdk/core';
import * as sqs from '@aws-cdk/aws-sqs';
import * as sns from '@aws-cdk/aws-sns';
import * as snsSubs from '@aws-cdk/aws-sns-subscriptions';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaEventSources from '@aws-cdk/aws-lambda-event-sources';
import * as lambdaNodejs from '@aws-cdk/aws-lambda-nodejs';
import path from 'path';

export interface IntegrationTestStackProps {
  testResourceTagKey: string;
  integrationTestTable?: boolean;
  testFunctionIds?: string[];
}

export default abstract class IntegrationTestStack extends cdk.Stack {
  //
  readonly testResourceTagKey: string;

  static readonly IntegrationTestTableId = 'IntegrationTestTable';

  readonly integrationTestTable: dynamodb.Table;

  readonly testFunctions: Record<string, lambda.IFunction>;

  constructor(scope: cdk.Construct, id: string, props: IntegrationTestStackProps) {
    super(scope, id);

    this.testResourceTagKey = props.testResourceTagKey;

    if (props.integrationTestTable || (props.testFunctionIds?.length ?? 0) > 0) {
      //
      // Test table

      this.integrationTestTable = new dynamodb.Table(
        this,
        IntegrationTestStack.IntegrationTestTableId,
        {
          partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
          sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }
      );

      this.addTestResourceTag(
        this.integrationTestTable,
        IntegrationTestStack.IntegrationTestTableId
      );
    }

    this.testFunctions = {};

    if (props.testFunctionIds) {
      props.testFunctionIds
        .map((i) => ({ observerId: i, function: this.newTestFunction(i) }))
        .forEach((iaf) => {
          this.testFunctions[iaf.observerId] = iaf.function;
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

  addTableSubscriber(
    table: dynamodb.ITable,
    testFunctionId: string,
    props?: lambdaEventSources.DynamoEventSourceProps
  ): void {
    //
    this.testFunctions[testFunctionId].addEventSource(
      new lambdaEventSources.DynamoEventSource(table, {
        ...{
          startingPosition: lambda.StartingPosition.TRIM_HORIZON,
        },
        ...props,
      })
    );
  }

  private newTestFunction(functionId: string): lambda.IFunction {
    //
    const functionEntryBase = path.join(__dirname, '.');

    const testFunction = new lambdaNodejs.NodejsFunction(this, `TestFunction-${functionId}`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      entry: path.join(functionEntryBase, `testFunction.ts`),
      handler: 'handler',
      environment: {
        FUNCTION_ID: functionId,
        INTEGRATION_TEST_TABLE_NAME: this.integrationTestTable.tableName,
      },
    });

    this.addTestResourceTag(testFunction, functionId);

    this.integrationTestTable.grantReadWriteData(testFunction);

    return testFunction;
  }
}
