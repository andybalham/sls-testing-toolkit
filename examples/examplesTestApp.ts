/* eslint-disable no-new */
import * as cdk from '@aws-cdk/core';
import SimpleRouterTestStack from './simple-router/SimpleRouterTestStack';

const app = new cdk.App();
cdk.Tags.of(app).add('app', 'ExamplesTestApp');

new SimpleRouterTestStack(app, 'SimpleRouterTestStack');
