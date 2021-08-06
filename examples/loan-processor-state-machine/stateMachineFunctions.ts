/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */

export const extractErrorClauseHandler = async (event: any): Promise<any> => {
  const cause = JSON.parse(event.Cause);
  console.log(JSON.stringify({ cause }, null, 2));
  return cause;
};
