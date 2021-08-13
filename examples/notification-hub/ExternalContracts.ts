export enum EventType {
  Lender = 'Lender',
}

export interface LenderEvent {
  lenderId: string;
  message: string;
}
