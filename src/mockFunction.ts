/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import TestFunctionClient from './TestFunctionClient';

const testFunctionClient = new TestFunctionClient();

const mockId = process.env.MOCK_ID;

export const handler = async (
  request: Record<string, any>
): Promise<Record<string, any> | undefined> => {
  //
  console.log(JSON.stringify({ request }, null, 2));

  if (mockId === undefined) throw new Error('mockId === undefined');

  const { mocks } = await testFunctionClient.getTestPropsAsync();

  if (mocks === undefined) throw new Error('inputs === undefined');

  const state = (await testFunctionClient.getMockStateAsync(mockId, {
    invocationCount: 0,
  })) as { invocationCount: number };

  await testFunctionClient.recordInvocationAsync({
    mockId,
    request,
    index: state.invocationCount,
  });

  state.invocationCount += 1;

  await testFunctionClient.setMockStateAsync(mockId, state);

  const mockExchanges = mocks[mockId];

  if (mockExchanges === undefined) {
    console.log(`No mock exchanges defined for id '${mockId}', so returning undefined`);
    return undefined;
  }

  let failSafe = 0;

  let mockExchangeCount = 0;
  let mockExchangeIndex = 0;

  while (mockExchangeCount < state.invocationCount && mockExchangeIndex < mockExchanges.length) {
    //
    failSafe += 1;
    if (failSafe > 1000) {
      throw new Error(`failSafe: ${failSafe}`);
    }

    const mockExchange = mockExchanges[mockExchangeIndex];

    if (mockExchange.repeat === 'FOREVER') {
      break;
    }

    mockExchangeCount += mockExchange.repeat ?? 1;

    if (mockExchangeCount < state.invocationCount) {
      mockExchangeIndex += 1;
    }
  }

  if (mockExchangeIndex >= mockExchanges.length) {
    console.log(`Exhausted mock exchanges for id '${mockId}', so returning undefined`);
    return undefined;
  }

  const mockExchange = mockExchanges[mockExchangeIndex];

  const { error, response } = mockExchange;

  if (error) {
    throw new Error(error);
  }

  console.log(JSON.stringify({ response }, null, 2));

  return response;
};
