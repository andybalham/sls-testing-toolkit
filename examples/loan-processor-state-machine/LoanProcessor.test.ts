/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { SNSEvent, SQSEvent } from 'aws-lambda';
import { expect } from 'chai';
import { StateMachineTestClient, TestObservation, UnitTestClient } from '../../src';
import { CreditRating, CreditRatingResponse, EmailEvent, LoanDetails } from './Contracts';
import LoanProcessorStateMachine from './LoanProcessorStateMachine';
import LoanProcessorTestStack from './LoanProcessorTestStack';

describe('LoanProcessor Tests', () => {
  //
  const testClient = new UnitTestClient({
    testResourceTagKey: LoanProcessorTestStack.ResourceTagKey,
    deleteLogs: true,
  });

  let sut: StateMachineTestClient;

  before(async () => {
    await testClient.initialiseClientAsync();
    sut = testClient.getStateMachineTestClient(LoanProcessorTestStack.LoanProcessorStateMachineId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('handles good Credit Rating', async () => {
    // Arrange

    const goodResponse: CreditRatingResponse = {
      value: CreditRating.Good,
    };

    await testClient.initialiseTestAsync({
      testId: 'credit-rating-good',
      mockResponses: {
        [LoanProcessorTestStack.CreditRatingFunctionId]: [
          {
            payload: goodResponse,
          },
        ],
      },
    });

    const loanDetails: LoanDetails = {
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'PR1 9LB',
      email: 'trevor.potato@mail.com',
    };

    // Act

    await sut.startExecutionAsync({ loanDetails });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => sut.isExecutionFinishedAsync(),
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(await sut.getStatusAsync()).to.equal('SUCCEEDED');

    // TODO 07Aug21: Assert loan detail saved
  });

  it.only('handles bad Credit Rating', async () => {
    // Arrange

    const goodResponse: CreditRatingResponse = {
      value: CreditRating.Bad,
    };

    await testClient.initialiseTestAsync({
      testId: 'credit-rating-bad',
      mockResponses: {
        [LoanProcessorTestStack.CreditRatingFunctionId]: [
          {
            payload: goodResponse,
          },
        ],
      },
    });

    const loanDetails: LoanDetails = {
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'PR1 9LB',
      email: 'trevor.potato@mail.com',
    };

    // Act

    await sut.startExecutionAsync({ loanDetails });

    // Await

    const { observations, timedOut } = await testClient.pollTestAsync({
      until: async (o) =>
        TestObservation.getCountById(o, LoanProcessorTestStack.DeclinedEventSubscriberId) > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(await sut.getStatusAsync()).to.equal('SUCCEEDED');

    const declinedSNSEvents = TestObservation.filterById(
      observations,
      LoanProcessorTestStack.DeclinedEventSubscriberId
    ).map((o) => o.data as SNSEvent);

    expect(declinedSNSEvents.length).to.be.greaterThan(0);

    const declinedEmailEvent = JSON.parse(
      declinedSNSEvents[0].Records[0].Sns.Message
    ) as EmailEvent;

    expect(declinedEmailEvent.email).to.equal(loanDetails.email);
  });

  it('handles Credit Rating max attempts', async () => {
    // Arrange

    await testClient.initialiseTestAsync({
      testId: 'credit-rating-max-attempts',
      mockResponses: {
        [LoanProcessorTestStack.CreditRatingFunctionId]: [
          {
            error: 'Max attempts',
            repeat: LoanProcessorStateMachine.CreditRatingMaxAttempts,
          },
        ],
      },
    });

    const loanDetails: LoanDetails = {
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'PR1 9LB',
      email: 'trevor.potato@mail.com',
    };

    // Act

    await sut.startExecutionAsync({ loanDetails });

    // Await

    const { timedOut } = await testClient.pollTestAsync({
      until: async () => sut.isExecutionFinishedAsync(),
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    expect(await sut.getStatusAsync()).to.equal('SUCCEEDED');
  });

  it('handles exceeding Credit Rating max attempts', async () => {
    // Arrange

    const expectedErrorMessage = 'Max attempts exceeded';

    await testClient.initialiseTestAsync({
      testId: 'exceed-credit-rating-max-attempts',
      mockResponses: {
        [LoanProcessorTestStack.CreditRatingFunctionId]: [
          {
            error: expectedErrorMessage,
            repeat: LoanProcessorStateMachine.CreditRatingMaxAttempts + 1,
          },
        ],
      },
    });

    const loanDetails: LoanDetails = {
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'PR1 9LB',
      email: 'trevor.potato@mail.com',
    };

    // Act

    await sut.startExecutionAsync({ loanDetails });

    // Await

    const { timedOut, observations } = await testClient.pollTestAsync({
      until: async (o) =>
        TestObservation.getCountById(o, LoanProcessorTestStack.ErrorQueueConsumerId) > 0,
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    const errorQueueEvents = TestObservation.filterById(
      observations,
      LoanProcessorTestStack.ErrorQueueConsumerId
    ).map((o) => o.data as SQSEvent);

    expect(errorQueueEvents.length).to.be.greaterThan(0);

    const errorQueueMessage = JSON.parse(errorQueueEvents[0].Records[0].body);

    expect(errorQueueMessage.Source).to.equal(LoanProcessorStateMachine.CreditRatingErrorSource);
    expect(errorQueueMessage.Cause.errorMessage).to.equal(expectedErrorMessage);
  });
});
