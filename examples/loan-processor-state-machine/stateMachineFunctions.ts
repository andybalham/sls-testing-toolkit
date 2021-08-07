/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

import { nanoid } from 'nanoid';
import { EmailEvent, LoanDetails, LoanItem } from './ExternalContracts';

export const extractErrorClauseHandler = async (input: any): Promise<any> => {
  const cause = JSON.parse(input.Cause);
  return cause;
};

export const buildDeclinedEventHandler = async (loanDetails: LoanDetails): Promise<EmailEvent> => {
  console.log(JSON.stringify({ loanDetails }, null, 2));
  return {
    email: loanDetails.email,
    message: `Dear ${loanDetails.firstName} ${loanDetails.lastName}, I am sorry to say your loan application has been declined.`,
  };
};

export const buildLoanItemHandler = async (loanDetails: LoanDetails): Promise<LoanItem> => {
  console.log(JSON.stringify({ loanDetails }, null, 2));
  return {
    id: nanoid(),
    loanDetails,
  };
};
