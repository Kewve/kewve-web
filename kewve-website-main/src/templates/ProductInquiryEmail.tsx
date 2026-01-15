import * as React from 'react';

interface FormCompanyInterestTemplateProps {
  productName: string;
  name: string;
  email: string;
  phone_number: string;
  country: string;
  company_name: string;
  quantity: string;
  delivery_date: string;
  target_price: string;
  info: string;
  request: string;
}

export const FormProductInquiryTemplate = (data: FormCompanyInterestTemplateProps) => (
  <div>
    <h1>
      {data.name} is interested in {data.productName}
    </h1>
    <h4>Full Name: {data.name}</h4>
    <h4>Product Name: {data.productName}</h4>
    <h4>Email: {data.email}</h4>
    <h4>Phone Number: {data.phone_number}</h4>
    <h4>Country: {data.country}</h4>
    <h4>Company Name: {data.company_name}</h4>
    <h4>Quantity: {data.quantity}</h4>
    <h4>Delivery Date: {data.delivery_date}</h4>
    <h4>Target Price: {data.target_price}</h4>
    <h4>Additional Info: {data.info}</h4>
    <h4>Special Requests: {data.request}</h4>
  </div>
);
