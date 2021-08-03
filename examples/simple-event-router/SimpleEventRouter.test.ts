/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SNSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { TestObservation, UnitTestClient } from '../../src';
import TopicTestClient from '../../src/TopicTestClient';
import { Event } from './Event';
import SimpleEventRouterTestStack from './SimpleEventRouterTestStack';

describe('SimpleEventRouter Test Suite', () => {
  //
  let testInputTopic: TopicTestClient;

  const testClient = new UnitTestClient({
    testResourceTagKey: SimpleEventRouterTestStack.ResourceTagKey,
  });

  before(async () => {
    await testClient.initialiseClientAsync();
    testInputTopic = testClient.getTopicTestClient(SimpleEventRouterTestStack.TestInputTopicId);
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

      const testEvent: Event = {
        values: theory.values,
      };

      // Act

      await testInputTopic.publishEventAsync(testEvent);

      // Await

      const { observations, timedOut } = await testClient.pollTestAsync({
        until: async ({ o }) => o.length > 0,
        intervalSeconds: 2,
        timeoutSeconds: 12,
      });

      // Assert

      expect(timedOut, 'timedOut').to.be.false;

      expect(observations.length).to.equal(1);

      const positiveObservations = TestObservation.filterById(
        observations,
        SimpleEventRouterTestStack.PositiveOutputTopicObserverId
      );

      const negativeObservations = TestObservation.filterById(
        observations,
        SimpleEventRouterTestStack.NegativeOutputTopicObserverId
      );

      if (theory.isExpectedPositive) {
        //
        expect(positiveObservations.length).to.equal(1);
        expect((positiveObservations[0].data as SNSEvent).Records.length).to.equal(1);

        const routedEvent = JSON.parse(
          (positiveObservations[0].data as SNSEvent).Records[0].Sns.Message
        );
        expect(routedEvent).to.deep.equal(testEvent);
        //
      } else {
        //
        expect(negativeObservations.length).to.equal(1);
        expect((negativeObservations[0].data as SNSEvent).Records.length).to.equal(1);

        const routedEvent = JSON.parse(
          (negativeObservations[0].data as SNSEvent).Records[0].Sns.Message
        );
        expect(routedEvent).to.deep.equal(testEvent);
      }
    });
  });
});
