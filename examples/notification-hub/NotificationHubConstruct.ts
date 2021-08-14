import * as cdk from '@aws-cdk/core';
import * as events from '@aws-cdk/aws-events';

export default class NotificationHubConstruct extends cdk.Construct {
  //
  readonly eventBus: events.EventBus;

  static readonly NotificationHubEventBusId = 'NotificationHubEventBus';

  constructor(scope: cdk.Construct, id: string) {
    super(scope, id);

    this.eventBus = new events.EventBus(this, NotificationHubConstruct.NotificationHubEventBusId);
  }
}
