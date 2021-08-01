/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { TestObservation, UnitTestClient } from '../../src';
import QueueTestClient from '../../src/QueueTestClient';
import { NumbersMessage } from './NumbersMessage';
import SimpleRouterTestStack from './SimpleRouterTestStack';

describe('SimpleRouter Test Suite', () => {
  //
  let testInputQueue: QueueTestClient;

  const testClient = new UnitTestClient({
    testResourceTagKey: SimpleRouterTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputQueue = testClient.getQueueTestClient(SimpleRouterTestStack.TestInputQueueId);
  });

  it('Routes positive sums correctly', async () => {
    // TODO 01Aug21: Make error better when not initialised
    await testClient.initialiseTestAsync({ testId: 'route-positive-sum' });

    // Arrange

    const positiveSumMessage: NumbersMessage = {
      values: [1, 2, 3],
    };

    // Act

    await testInputQueue.sendMessageAsync(positiveSumMessage);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(observations.length).to.equal(1);

    const positiveObservations = TestObservation.filterById(
      observations,
      SimpleRouterTestStack.PositiveOutputQueueObserverId
    );

    expect(positiveObservations.length).to.equal(1);
  });

  it('Routes negative sums correctly', async () => {
    await testClient.initialiseTestAsync({ testId: 'route-negative-sum' });

    // Arrange

    const negativeSumMessage: NumbersMessage = {
      values: [1, -2],
    };

    // Act

    await testInputQueue.sendMessageAsync(negativeSumMessage);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(observations.length).to.equal(1);

    const negativeObservations = TestObservation.filterById(
      observations,
      SimpleRouterTestStack.NegativeOutputQueueObserverId
    );

    expect(negativeObservations.length).to.equal(1);
  });
});
