/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import LoanProcessorTestStack from './loan-processor-state-machine/LoanProcessorTestStack';
import NotificationHubTestStack from './notification-hub/NotificationHubTestStack';
import SimpleEventRouterTestStack from './simple-event-router/SimpleEventRouterTestStack';
import SimpleMessageRouterTestStack from './simple-message-router/SimpleMessageRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ExamplesApp');

new SimpleEventRouterTestStack(app, 'SimpleEventRouterTestStack');
new SimpleMessageRouterTestStack(app, 'SimpleMessageRouterTestStack');
new LoanProcessorTestStack(app, 'LoanProcessorTestStack');
new NotificationHubTestStack(app, 'NotificationHubTestStack');
