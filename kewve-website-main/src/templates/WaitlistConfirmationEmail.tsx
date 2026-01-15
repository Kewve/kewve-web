import * as React from 'react';

interface WaitlistConfirmationEmailProps {
  firstName: string;
}

export const WaitlistConfirmationEmailTemplate = (data: WaitlistConfirmationEmailProps) => (
  <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '600px', margin: '0 auto', backgroundColor: '#ffffff' }}>
    <div style={{ marginTop: '20px', lineHeight: '1.8', color: '#333' }}>
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>
        Hello {data.firstName},
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>
        Thank you for registering your interest in Kewve's Export Readiness Assessment.
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>
        Kewve is making African food and beverage products globally accessible by building Africa's export infrastructure, by helping producers prepare their products for global buyers in the UK, EU and beyond.
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '15px', fontWeight: 'bold' }}>
        By joining the waiting list, you'll receive:
      </p>
      
      <ul style={{ fontSize: '16px', marginBottom: '20px', paddingLeft: '20px' }}>
        <li style={{ marginBottom: '10px' }}>Early access to the Export Readiness Assessment</li>
        <li style={{ marginBottom: '10px' }}>Priority onboarding when registration opens</li>
        <li style={{ marginBottom: '10px' }}>Updates on buyer sourcing opportunities and trade showcases</li>
        <li style={{ marginBottom: '10px' }}>Guidance on what global buyers require before placing orders</li>
      </ul>
      
      <p style={{ fontSize: '16px', marginBottom: '15px', fontWeight: 'bold' }}>
        The Export Readiness Assessment will help you:
      </p>
      
      <ul style={{ fontSize: '16px', marginBottom: '20px', paddingLeft: '20px' }}>
        <li style={{ marginBottom: '10px' }}>Understand your export readiness level</li>
        <li style={{ marginBottom: '10px' }}>Identify gaps in compliance, packaging and pricing</li>
        <li style={{ marginBottom: '10px' }}>Prepare your products for international trade</li>
      </ul>
      
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>
        We'll be in touch soon with next steps and launch updates.
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '20px' }}>
        If you have any questions in the meantime, you can reach us at <a href="mailto:hello@kewve.com" style={{ color: '#f97316' }}>hello@kewve.com</a>.
      </p>
      
      <p style={{ fontSize: '16px', marginTop: '30px', marginBottom: '5px' }}>
        Warm regards,
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '5px', fontWeight: 'bold' }}>
        Abiola Ofurhie
      </p>
      
      <p style={{ fontSize: '16px', marginBottom: '5px' }}>
        Founder, Kewve
      </p>
      
      <p style={{ fontSize: '14px', marginTop: '10px', color: '#777', fontStyle: 'italic' }}>
        Building Africa's export infrastructure for food & beverages.
      </p>
      
      <div style={{ marginTop: '40px', textAlign: 'center', paddingTop: '20px', borderTop: '1px solid #e5e7eb' }}>
        <img 
          src={`${process.env.NEXT_PUBLIC_SITE_URL || 'https://kewve.com'}/images/email-footer.png`}
          alt="Kewve Footer" 
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  </div>
);
