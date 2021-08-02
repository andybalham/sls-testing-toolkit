// eslint-disable-next-line import/no-extraneous-dependencies
import AWS from 'aws-sdk';
// eslint-disable-next-line import/no-extraneous-dependencies
import sns from 'aws-sdk/clients/sns';

export default class TopicTestClient {
  //
  private readonly sns: AWS.SNS;

  constructor(region: string, private topicArn: string) {
    this.sns = new AWS.SNS({ region });
  }

  async publishEventAsync(
    message: Record<string, any>,
    messageAttributes?: sns.MessageAttributeMap
  ): Promise<void> {
    //
    const publishInput: sns.PublishInput = {
      Message: JSON.stringify(message),
      TopicArn: this.topicArn,
      MessageAttributes: messageAttributes,
    };

    await this.sns.publish(publishInput).promise();
  }

}
