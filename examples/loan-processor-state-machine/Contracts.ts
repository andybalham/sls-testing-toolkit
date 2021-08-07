export interface LoanDetails {
  firstName: string;
  lastName: string;
  postcode: string;
  email: string;
}

export interface CreditRatingRequest {
  firstName: string;
  lastName: string;
  postcode: string;
}

export enum CreditRating {
  Good = 'GOOD',
  Bad = 'BAD',
}

export interface CreditRatingResponse {
  value: CreditRating;
}

export interface EmailEvent {
  email: string;
  message: string;
}
