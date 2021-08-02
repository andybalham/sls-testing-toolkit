/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import SimpleMessageRouterTestStack from './simple-message-router/SimpleMessageRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ExamplesApp');

new SimpleMessageRouterTestStack(app, 'SimpleMessageRouterTestStack');
