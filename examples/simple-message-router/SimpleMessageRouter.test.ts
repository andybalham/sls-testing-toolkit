/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SQSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { TestObservation, UnitTestClient } from '../../src';
import QueueTestClient from '../../src/QueueTestClient';
import { Message } from './Message';
import SimpleMessageRouterTestStack from './SimpleMessageRouterTestStack';

describe('SimpleRouter Test Suite', () => {
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
        SimpleMessageRouterTestStack.PositiveOutputQueueObserverId
      );

      const negativeObservations = TestObservation.filterById(
        observations,
        SimpleMessageRouterTestStack.NegativeOutputQueueObserverId
      );

      if (theory.isExpectedPositive) {
        //
        expect(positiveObservations.length).to.equal(1);
        expect((positiveObservations[0].data as SQSEvent).Records.length).to.equal(1);

        const routedMessage = JSON.parse(
          (positiveObservations[0].data as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
        //
      } else {
        //
        expect(negativeObservations.length).to.equal(1);
        expect((negativeObservations[0].data as SQSEvent).Records.length).to.equal(1);

        const routedMessage = JSON.parse(
          (negativeObservations[0].data as SQSEvent).Records[0].body
        );
        expect(routedMessage).to.deep.equal(testMessage);
      }
    });
  });
});
