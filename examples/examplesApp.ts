/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import SimpleEventRouterTestStack from './simple-event-router/SimpleEventRouterTestStack';
import SimpleMessageRouterTestStack from './simple-message-router/SimpleMessageRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ExamplesApp');

new SimpleMessageRouterTestStack(app, 'SimpleMessageRouterTestStack');
new SimpleEventRouterTestStack(app, 'SimpleEventRouterTestStack');
