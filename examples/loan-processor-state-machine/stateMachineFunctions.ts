/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { EmailEvent, LoanDetails } from './Contracts';

export const extractErrorClauseHandler = async (input: any): Promise<any> => {
  const cause = JSON.parse(input.Cause);
  return cause;
};

export const buildDeclinedEventHandler = async (
  loanDetails: LoanDetails
): Promise<EmailEvent> => {
  console.log(JSON.stringify({ loanDetails }, null, 2));
  return {
    email: loanDetails.email,
    message: `Dear ${loanDetails.firstName} ${loanDetails.lastName}, I am sorry to say your loan application has been declined.`,
  };
};
