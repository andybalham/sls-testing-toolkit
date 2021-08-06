// eslint-disable-next-line import/no-extraneous-dependencies
import {
  PaginationToken as ResourcePaginationToken,
  ResourceTagMapping,
  ResourceTagMappingList,
} from 'aws-sdk/clients/resourcegroupstaggingapi';
// eslint-disable-next-line import/no-extraneous-dependencies
import dynamodb from 'aws-sdk/clients/dynamodb';
// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
import dotenv from 'dotenv';
import UnitTestStack from './UnitTestStack';
import { CurrentTestItem, TestItemKey, TestItemPrefix } from './TestItem';
import StateMachineTestClient from './StateMachineTestClient';
import TestObservation from './TestObservation';
import { TestProps } from './TestProps';
import BucketTestClient from './BucketTestClient';
import FunctionTestClient from './FunctionTestClient';
import TopicTestClient from './TopicTestClient';
import TableTestClient from './TableTestClient';
import QueueTestClient from './QueueTestClient';
import { deleteAllLogs } from './cloudwatch';

dotenv.config();

export interface UnitTestClientProps {
  testResourceTagKey: string;
  deleteLogs?: boolean;
}

export default class UnitTestClient {
  //
  private static readonly tagging = new AWS.ResourceGroupsTaggingAPI({
    region: UnitTestClient.getRegion(),
  });

  private static readonly db = new AWS.DynamoDB.DocumentClient({
    region: UnitTestClient.getRegion(),
  });

  testResourceTagMappingList: ResourceTagMappingList;

  unitTestTableName?: string;

  testId: string;

  constructor(private props: UnitTestClientProps) {}

  // Static ------------------------------------------------------------------

  static getRegion(): string {
    if (process.env.AWS_REGION === undefined)
      throw new Error('process.env.AWS_REGION === undefined');
    return process.env.AWS_REGION;
  }

  static async sleepAsync(seconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  static async getResourcesByTagKeyAsync(key: string): Promise<ResourceTagMappingList> {
    //
    let resourceTagMappings: ResourceTagMapping[] = [];

    let paginationToken: ResourcePaginationToken | undefined;

    do {
      // eslint-disable-next-line no-await-in-loop
      const resourcesOutput = await UnitTestClient.tagging
        .getResources({
          TagFilters: [
            {
              Key: key,
            },
          ],
          PaginationToken: paginationToken,
        })
        .promise();

      resourceTagMappings = resourceTagMappings.concat(
        resourcesOutput.ResourceTagMappingList ?? []
      );

      paginationToken = resourcesOutput.PaginationToken;
      //
    } while (paginationToken);

    return resourceTagMappings;
  }

  // Instance ----------------------------------------------------------------

  async initialiseClientAsync(): Promise<void> {
    //
    this.testResourceTagMappingList = await UnitTestClient.getResourcesByTagKeyAsync(
      this.props.testResourceTagKey
    );

    this.unitTestTableName = this.getTableNameByStackId(UnitTestStack.UnitTestTableId);

    const testFunctionNames = this.testResourceTagMappingList
      .filter((m) => m.ResourceARN?.match(UnitTestClient.ResourceNamePatterns.function))
      .map((m) => m.ResourceARN?.match(UnitTestClient.ResourceNamePatterns.function)?.groups?.name);

    if (this.props.deleteLogs) {
      // eslint-disable-next-line no-restricted-syntax
      for await (const testFunctionName of testFunctionNames) {
        if (testFunctionName) {
          try {
            await deleteAllLogs(UnitTestClient.getRegion(), testFunctionName);
          } catch (error) {
            // Ignore
          }
        }
      }
    }
  }

  async initialiseTestAsync(props: TestProps = { testId: 'default-test-id' }): Promise<void> {
    //
    this.testId = props.testId;

    if (this.unitTestTableName !== undefined) {
      //
      // Clear down all data related to the test

      let testItemKeys = new Array<TestItemKey>();

      let lastEvaluatedKey: dynamodb.Key | undefined;

      do {
        const testQueryParams /*: QueryInput */ = {
          // QueryInput results in a 'Condition parameter type does not match schema type'
          TableName: this.unitTestTableName,
          KeyConditionExpression: `PK = :PK`,
          ExpressionAttributeValues: {
            ':PK': this.testId,
          },
          ExclusiveStartKey: lastEvaluatedKey,
        };

        // eslint-disable-next-line no-await-in-loop
        const testQueryOutput = await UnitTestClient.db.query(testQueryParams).promise();

        if (testQueryOutput.Items) {
          testItemKeys = testItemKeys.concat(testQueryOutput.Items.map((i) => i as TestItemKey));
        }

        lastEvaluatedKey = testQueryOutput.LastEvaluatedKey;
        //
      } while (lastEvaluatedKey);

      if (testItemKeys.length > 0) {
        const deleteRequests = testItemKeys.map((k) => ({
          DeleteRequest: { Key: { PK: k.PK, SK: k.SK } },
        }));

        await UnitTestClient.db
          .batchWrite({ RequestItems: { [this.unitTestTableName]: deleteRequests } })
          .promise();
      }

      // Set the current test and inputs

      const currentTestItem: CurrentTestItem = {
        ...{
          PK: 'Current',
          SK: 'Test',
        },
        props,
      };

      await UnitTestClient.db
        .put({
          TableName: this.unitTestTableName,
          Item: currentTestItem,
        })
        .promise();
    }
  }

  async pollTestAsync({
    until,
    intervalSeconds = 2,
    timeoutSeconds = 12,
  }: {
    until: (o: TestObservation[]) => Promise<boolean>;
    intervalSeconds?: number;
    timeoutSeconds?: number;
  }): Promise<{
    observations: TestObservation[];
    timedOut: boolean;
  }> {
    //
    const timeOutThreshold = Date.now() + 1000 * timeoutSeconds;

    const timedOut = (): boolean => Date.now() > timeOutThreshold;

    let observations = new Array<TestObservation>();

    // eslint-disable-next-line no-await-in-loop
    while (!timedOut() && !(await until(observations))) {
      //
      // eslint-disable-next-line no-await-in-loop
      await UnitTestClient.sleepAsync(intervalSeconds);

      // eslint-disable-next-line no-await-in-loop
      observations = await this.getTestObservationsAsync();
    }

    return {
      timedOut: !(await until(observations)),
      observations,
    };
  }

  async getTestObservationsAsync(): Promise<TestObservation[]> {
    //
    let allObservations = new Array<TestObservation>();

    if (this.unitTestTableName === undefined) {
      return allObservations;
    }

    let lastEvaluatedKey: dynamodb.Key | undefined;

    do {
      const queryObservationsParams /*: QueryInput */ = {
        // QueryInput results in a 'Condition parameter type does not match schema type'
        TableName: this.unitTestTableName,
        KeyConditionExpression: `PK = :PK and begins_with(SK, :SKPrefix)`,
        ExpressionAttributeValues: {
          ':PK': this.testId,
          ':SKPrefix': TestItemPrefix.TestObservation,
        },
        ExclusiveStartKey: lastEvaluatedKey,
      };

      // eslint-disable-next-line no-await-in-loop
      const queryObservationsOutput = await UnitTestClient.db
        .query(queryObservationsParams)
        .promise();

      if (!queryObservationsOutput.Items) {
        return allObservations;
      }

      const observations = queryObservationsOutput.Items.map(
        (i) => i.observation as TestObservation
      );

      allObservations = allObservations.concat(observations);

      lastEvaluatedKey = queryObservationsOutput.LastEvaluatedKey;
      //
    } while (lastEvaluatedKey);

    return allObservations;
  }

  getFunctionTestClient(functionStackId: string): FunctionTestClient {
    //
    const functionName = this.getFunctionNameByStackId(functionStackId);

    if (functionName === undefined) {
      throw new Error(`The function name could not be resolved for id: ${functionStackId}`);
    }

    return new FunctionTestClient(UnitTestClient.getRegion(), functionName);
  }

  getBucketTestClient(bucketStackId: string): BucketTestClient {
    //
    const bucketName = this.getBucketNameByStackId(bucketStackId);

    if (bucketName === undefined) {
      throw new Error(`The bucket name could not be resolved for id: ${bucketStackId}`);
    }

    return new BucketTestClient(UnitTestClient.getRegion(), bucketName);
  }

  getTableTestClient(tableStackId: string): TableTestClient {
    //
    const tableName = this.getTableNameByStackId(tableStackId);

    if (tableName === undefined) {
      throw new Error(`The table name could not be resolved for id: ${tableStackId}`);
    }

    return new TableTestClient(UnitTestClient.getRegion(), tableName);
  }

  getStateMachineTestClient(stateMachineStackId: string): StateMachineTestClient {
    //
    const stateMachineArn = this.getResourceArnByStackId(stateMachineStackId);

    if (stateMachineArn === undefined) {
      throw new Error(`The state machine ARN could not be resolved for id: ${stateMachineStackId}`);
    }

    return new StateMachineTestClient(UnitTestClient.getRegion(), stateMachineArn);
  }

  getTopicTestClient(topicStackId: string): TopicTestClient {
    //
    const topicArn = this.getResourceArnByStackId(topicStackId);

    if (topicArn === undefined) {
      throw new Error(`The topic ARN could not be resolved for id: ${topicStackId}`);
    }

    return new TopicTestClient(UnitTestClient.getRegion(), topicArn);
  }

  getQueueTestClient(queueStackId: string): QueueTestClient {
    //
    const queueUrl = this.getQueueUrlByStackId(queueStackId);

    if (queueUrl === undefined) {
      throw new Error(`The queue URL could not be resolved for id: ${queueStackId}`);
    }

    return new QueueTestClient(UnitTestClient.getRegion(), queueUrl);
  }

  getResourceArnByStackId(targetStackId: string): string | undefined {
    //
    if (this.testResourceTagMappingList === undefined)
      throw new Error('this.testResourceTagMappingList === undefined');

    const tagMatches = this.testResourceTagMappingList.filter(
      (r) =>
        r.Tags &&
        r.Tags.some((t) => t.Key === this.props.testResourceTagKey && t.Value === targetStackId)
    );

    if (tagMatches.length === 0) {
      return undefined;
    }

    if (tagMatches.length > 1) {
      throw new Error(
        `Found ${
          tagMatches.length
        } matches for ${targetStackId}, when 1 was expected: ${JSON.stringify(tagMatches)}`
      );
    }

    const tagMatchArn = tagMatches[0].ResourceARN ?? 'undefined';
    return tagMatchArn;
  }

  // https://docs.aws.amazon.com/service-authorization/latest/reference/reference_policies_actions-resources-contextkeys.html
  static readonly ResourceNamePatterns = {
    // arn:${Partition}:sqs:${Region}:${Account}:${QueueName}
    queue: new RegExp(`^arn:aws:sqs:${UnitTestClient.getRegion()}:(?<account>[0-9]+):(?<name>.*)`),
    // arn:${Partition}:s3:::${BucketName}
    bucket: /^arn:aws:s3:::(?<name>.*)/,
    // arn:${Partition}:dynamodb:${Region}:${Account}:table/${TableName}
    table: new RegExp(`^arn:aws:dynamodb:${UnitTestClient.getRegion()}:[0-9]+:table/(?<name>.*)`),
    // arn:${Partition}:lambda:${Region}:${Account}:function:${FunctionName}:${Version}
    function: new RegExp(
      `^arn:aws:lambda:${UnitTestClient.getRegion()}:[0-9]+:function:(?<name>[^:]*)`
    ),
  };

  getQueueUrlByStackId(targetStackId: string): string | undefined {
    //
    const arn = this.getResourceArnByStackId(targetStackId);

    if (arn === undefined) {
      return undefined;
    }

    const arnMatch = arn.match(UnitTestClient.ResourceNamePatterns.queue);

    if (!arnMatch || !arnMatch.groups?.account || !arnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${arn}`);
    }

    const queueUrl = `https://sqs.${UnitTestClient.getRegion()}.amazonaws.com/${
      arnMatch.groups.account
    }/${arnMatch.groups?.name}`;

    return queueUrl;
  }

  getBucketNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.bucket
    );
    return resourceName;
  }

  getTableNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.table
    );
    return resourceName;
  }

  getFunctionNameByStackId(targetStackId: string): string | undefined {
    const resourceName = this.getResourceNameFromArn(
      targetStackId,
      UnitTestClient.ResourceNamePatterns.function
    );
    return resourceName;
  }

  // Private --------------------------------------------------------

  private getResourceNameFromArn(targetStackId: string, arnPattern: RegExp): string | undefined {
    //
    const tagMatchArn = this.getResourceArnByStackId(targetStackId);

    if (tagMatchArn === undefined) {
      return undefined;
    }

    const arnMatch = tagMatchArn.match(arnPattern);

    if (!arnMatch || !arnMatch.groups?.name) {
      throw new Error(`ARN did not match expected pattern: ${tagMatchArn}`);
    }

    const resourceName = arnMatch.groups.name;
    return resourceName;
  }
}
