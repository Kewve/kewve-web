export interface WaitlistInput {
  businessName: string;
  contactName: string;
  email: string;
  country: string;
  productCategory: string;
  exportInterest: "Yes" | "Exploring";
}

export interface Waitlist extends WaitlistInput {
  id: string | number;
  createdAt: Date;
  updatedAt?: Date;
}


