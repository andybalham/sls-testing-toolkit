import { UnitTestClient } from '../../src';
import SimpleRouterTestStack from './SimpleRouterTestStack';

describe('SimpleRouter Test Suite', () => {
  const testClient = new UnitTestClient({
    testResourceTagKey: SimpleRouterTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
    // TODO 01Aug21: Need to get an SQS client
  });
});
