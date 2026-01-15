import * as React from 'react';

interface FormSubmissionEmailProps {
  email: string;
  first_name: string;
  last_name: string;
  message: string;
  country: string;
  account_type: string;
}

export const FormSubmissionEmailTemplate = (data: FormSubmissionEmailProps) => (
  <div>
    <h1>{data.first_name} has submitted a contact request!</h1>
    <h4>First Name: {data.first_name}</h4>
    <h4>Last Name: {data.last_name}</h4>
    <h4>Email: {data.email}</h4>
    <h4>Account Type: {data.account_type}</h4>
    <h4>Country: {data.country}</h4>
    <h4>Message:</h4>
    <p>{data.message}</p>
  </div>
);
