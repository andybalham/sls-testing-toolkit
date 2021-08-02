/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SQSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { TestObservation, UnitTestClient } from '../../src';
import MockInvocation from '../../src/MockInvocation';
import QueueTestClient from '../../src/QueueTestClient';
import { Message } from './Message';
import SimpleMessageRouterTestStack from './SimpleMessageRouterTestStack';

describe('SimpleMessageRouter Test Suite', () => {
  //
  let testInputQueue: QueueTestClient;

  const testClient = new UnitTestClient({
    testResourceTagKey: SimpleMessageRouterTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputQueue = testClient.getQueueTestClient(SimpleMessageRouterTestStack.TestInputQueueId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  [
    { values: [], isExpectedPositive: true },
    { values: [1, 2, 3], isExpectedPositive: true },
    { values: [1, 2, -3], isExpectedPositive: true },
    { values: [1, -2, -3], isExpectedPositive: false },
  ].forEach((theory) => {
    it(`Routes as expected: ${JSON.stringify(theory)}`, async () => {
      // Arrange

      const testMessage: Message = {
        values: theory.values,
      };

      // Act

      await testInputQueue.sendMessageAsync(testMessage);

      // Await

      const { invocations, timedOut } = await testClient.pollTestAsync({
        until: async (_o, i) => i.length > 0,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      expect(invocations.length).to.equal(1);

      const positiveInvocations = MockInvocation.filterById(
        invocations,
        SimpleMessageRouterTestStack.PositiveOutputQueueMockId
      );

      const negativeInvocations = MockInvocation.filterById(
        invocations,
        SimpleMessageRouterTestStack.NegativeOutputQueueMockId
      );

      if (theory.isExpectedPositive) {
        //
        expect(positiveInvocations.length).to.equal(1);
        expect((positiveInvocations[0].request as SQSEvent).Records.length).to.equal(1);

        const routedMessage = JSON.parse(
          (positiveInvocations[0].request as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
        //
      } else {
        //
        expect(negativeInvocations.length).to.equal(1);
        expect((negativeInvocations[0].request as SQSEvent).Records.length).to.equal(1);

        const routedMessage = JSON.parse(
          (negativeInvocations[0].request as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
      }
    });
  });

  it('routes to DLQ', async () => {
    // Arrange
    await testClient.initialiseTestAsync({
      testId: 'routes-to-dlq',
      mocks: {
        [SimpleMessageRouterTestStack.PositiveOutputQueueMockId]: [
          { error: 'Positive error', repeat: 3 },
        ],
      },
    });

    const testMessage: Message = {
      values: [],
    };

    // Act

    await testInputQueue.sendMessageAsync(testMessage);

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) => o.length > 0,
      intervalSeconds: 2,
      timeoutSeconds: 12,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const positiveDLQObservations = TestObservation.filterById(
      observations,
      SimpleMessageRouterTestStack.PositiveOutputDLQObserverId
    );

    expect(positiveDLQObservations.length).to.equal(1);
  });

  it('retries', async () => {
    // Arrange
    await testClient.initialiseTestAsync({
      testId: 'routes-to-dlq',
      mocks: {
        [SimpleMessageRouterTestStack.PositiveOutputQueueMockId]: [
          { error: 'Positive error', repeat: 2 },
        ],
      },
    });

    const testMessage: Message = {
      values: [],
    };

    // Act

    await testInputQueue.sendMessageAsync(testMessage);

    // Await

    const { invocations, timedOut } = await testClient.pollTestAsync({
      until: async (_o, i) => i.length > 2,
      intervalSeconds: 2,
      timeoutSeconds: 16,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(invocations.length).to.equal(3);
  });
});
