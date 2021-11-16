// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';

export default class LambdaTestClient {
  //
  readonly lambda: AWS.Lambda;

  constructor(public readonly region: string, public readonly functionName: string) {
    this.lambda = new AWS.Lambda({ region });
  }

  async invokeAsync<TReq, TRes>(request?: TReq): Promise<TRes | undefined> {
    //
    const lambdaPayload = request ? { Payload: JSON.stringify(request) } : {};

    const params = {
      FunctionName: this.functionName,
      ...lambdaPayload,
    };

    const { Payload } = await this.lambda.invoke(params).promise();

    if (Payload) {
      return JSON.parse(Payload.toString());
    }

    return undefined;
  }
}
