import * as React from 'react';

interface WaitlistSubmissionEmailProps {
  businessName: string;
  contactName: string;
  email: string;
  country: string;
  productCategory: string;
  exportInterest: string;
}

export const WaitlistSubmissionEmailTemplate = (data: WaitlistSubmissionEmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
    <h1 style={{ color: '#333', borderBottom: '2px solid #f97316', paddingBottom: '10px' }}>
      New Export Readiness Assessment Interest Form Submission
    </h1>
    
    <div style={{ marginTop: '20px', lineHeight: '1.6' }}>
      <p style={{ fontSize: '16px', color: '#555' }}>
        A new producer has joined the Export Readiness Assessment waiting list:
      </p>
      
      <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3 style={{ color: '#333', marginTop: '0' }}>Business Details</h3>
        <p><strong>Business Name:</strong> {data.businessName}</p>
        <p><strong>Contact Name:</strong> {data.contactName}</p>
        <p><strong>Email:</strong> <a href={`mailto:${data.email}`} style={{ color: '#f97316' }}>{data.email}</a></p>
        <p><strong>Country:</strong> {data.country}</p>
        <p><strong>Product Category:</strong> {data.productCategory}</p>
        <p><strong>Export Interest:</strong> {data.exportInterest}</p>
      </div>
      
      <p style={{ marginTop: '20px', fontSize: '14px', color: '#777' }}>
        This producer is interested in the Export Readiness Assessment and should be prioritized for onboarding when available.
      </p>
    </div>
  </div>
);
