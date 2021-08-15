export interface PutEventsRequestEntry {
  /**
   * The source of the event.
   */
  Source?: string;
  /**
   * Free-form string used to decide what fields to expect in the event detail.
   */
  DetailType?: string;
  /**
   * A valid JSON string. There is no other schema imposed. The JSON string may contain fields and nested sub-objects.
   */
  Detail?: string;
}

/*
Source: lender.loans-r-us
DetailType: CaseStatusUpdated, FeePaymentRequired, ChecklistSatisfied
*/

export enum CaseEventType {
  CaseStatusUpdated = 'CaseStatusUpdated',
  CasePaymentRequiredEvent = 'CasePaymentRequiredEvent',
}

export interface CaseEvent {
  eventType: CaseEventType;
  lenderId: string; // loans-r-us
  distributorId: string; // money-cattle-market
  caseId: string;
}

export enum CaseStatus {
  Accepted = 'Accepted',
  Referred = 'Referred',
  Declined = 'Declined',
}

export interface CaseStatusUpdatedEvent extends CaseEvent {
  oldStatus?: CaseStatus;
  newStatus: CaseStatus;
  statusChangedDate: string;
}

export interface CasePaymentRequiredEvent extends CaseEvent {
  paymentId: string;
  description: string;
}
