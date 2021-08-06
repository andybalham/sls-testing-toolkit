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

export interface CreditRatingResponse {
  value: 'GOOD' | 'POOR' | 'BAD';
}
