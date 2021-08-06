/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unused-expressions */
import { expect } from 'chai';
import { StateMachineTestClient, UnitTestClient } from '../../src';
import { LoanDetails } from './Contracts';
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
    sut = testClient.getStateMachineTestClient(LoanProcessorTestStack.SutId);
  });

  beforeEach(async () => {
    await testClient.initialiseTestAsync();
  });

  it('Accept', async () => {
    // Arrange

    const loanDetails: LoanDetails = {
      firstName: 'Trevor',
      lastName: 'Potato',
      postcode: 'PR1 9LB',
      email: 'trevor.potato@mail.com',
    };

    await testClient.initialiseTestAsync({
      testId: 'accept',
      mockResponses: {
        [LoanProcessorTestStack.CreditRatingFunctionId]: [
          {
            error: 'Test error', repeat: 'FOREVER',
          },
        ],
      },
    });

    // Act

    await sut.startExecutionAsync({ loanDetails });

    // Await

    const { timedOut, observations } = await testClient.pollTestAsync({
      until: async () => sut.isExecutionFinishedAsync(),
    });

    // Assert

    expect(timedOut, 'timedOut').to.be.false;

    observations.forEach((observation) => {
      console.log(JSON.stringify({ o: observation }, null, 2));
    });
  });
});
