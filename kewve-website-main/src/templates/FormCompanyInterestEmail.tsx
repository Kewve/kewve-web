import * as React from 'react';

interface FormCompanyInterestTemplateProps {
  account_type: string;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
  phone_number: string;
  website: string;
}

export const FormCompanyInterestTemplate = (data: FormCompanyInterestTemplateProps) => (
  <div>
    <h1>A new {data.account_type} has submitted a form request!</h1>
    <h4>First Name: {data.first_name}</h4>
    <h4>Last Name: {data.last_name}</h4>
    <h4>Email: {data.email}</h4>
    <h4>Account Type: {data.account_type}</h4>
    <h4>Company Name: {data.company_name}</h4>
    <h4>Phone Number: {data.phone_number}</h4>
    <h4>Website: {data.website}</h4>
  </div>
);
