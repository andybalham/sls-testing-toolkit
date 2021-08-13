import * as cdk from '@aws-cdk/core';
import { IntegrationTestStack } from '../../src';

export default class NotificationHubTestStack extends IntegrationTestStack {
  //
  static readonly TestResourceTagKey = 'NotificationHubTestStack';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id, {
      testResourceTagKey: NotificationHubTestStack.TestResourceTagKey,
    });
  }
}
