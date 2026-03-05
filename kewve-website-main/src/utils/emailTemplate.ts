interface WaitlistConfirmationEmailProps {
  firstName: string;
  useCID?: boolean; // If true, use cid: footer-image instead of URL
}

export const getWaitlistConfirmationEmailHTML = (data: WaitlistConfirmationEmailProps): string => {
  // Use CID reference for embedded image, fallback to URL if not embedded
  const footerImageSrc = data.useCID ? 'cid:footer-image' : `${process.env.FRONTEND_URL || 'https://kewve.com'}/images/email-footer.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Kewve Export Readiness Waiting List</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="margin-top: 20px; line-height: 1.8; color: #333;">
      <p style="font-size: 16px; margin-bottom: 20px;">
        Hello ${data.firstName},
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Thank you for registering your interest in Kewve's Export Readiness Assessment.
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        Kewve is making African food and beverage products globally accessible by building Africa's export infrastructure, by helping producers prepare their products for global buyers in the UK, EU and beyond.
      </p>
      
      <p style="font-size: 16px; margin-bottom: 15px; font-weight: bold;">
        By joining the waiting list, you'll receive:
      </p>
      
      <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Early access to the Export Readiness Assessment</li>
        <li style="margin-bottom: 10px;">Priority onboarding when registration opens</li>
        <li style="margin-bottom: 10px;">Updates on buyer sourcing opportunities and trade showcases</li>
        <li style="margin-bottom: 10px;">Guidance on what global buyers require before placing orders</li>
      </ul>
      
      <p style="font-size: 16px; margin-bottom: 15px; font-weight: bold;">
        The Export Readiness Assessment will help you:
      </p>
      
      <ul style="font-size: 16px; margin-bottom: 20px; padding-left: 20px;">
        <li style="margin-bottom: 10px;">Understand your export readiness level</li>
        <li style="margin-bottom: 10px;">Identify gaps in compliance, packaging and pricing</li>
        <li style="margin-bottom: 10px;">Prepare your products for international trade</li>
      </ul>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        We'll be in touch soon with next steps and launch updates.
      </p>
      
      <p style="font-size: 16px; margin-bottom: 20px;">
        If you have any questions in the meantime, you can reach us at <a href="mailto:hello@kewve.com" style="color: #f97316; text-decoration: none;">hello@kewve.com</a>.
      </p>
      
      <p style="font-size: 16px; margin-top: 30px; margin-bottom: 5px;">
        Warm regards,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 5px; font-weight: bold;">
        Abiola Ofurhie
      </p>
      
      <p style="font-size: 16px; margin-bottom: 5px;">
        Founder, Kewve
      </p>
      
      <p style="font-size: 14px; margin-top: 10px; color: #777; font-style: italic;">
        Building Africa's export infrastructure for food & beverages.
      </p>
      
      <div style="margin-top: 40px; text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <img 
          src="${footerImageSrc}" 
          alt="Kewve Footer" 
          style="max-width: 100%; height: auto; display: block; margin: 0 auto;"
        />
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
};

interface WaitlistAdminNotificationProps {
  businessName: string;
  contactName: string;
  email: string;
  country: string;
  productCategory: string;
  exportInterest: string;
}

export const getWaitlistAdminNotificationHTML = (data: WaitlistAdminNotificationProps): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Waitlist Submission - Export Readiness Assessment</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #333; border-bottom: 2px solid #f97316; padding-bottom: 10px; margin-bottom: 20px;">
      New Export Readiness Assessment Interest Form Submission
    </h1>
    
    <div style="margin-top: 20px; line-height: 1.6; color: #333;">
      <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
        A new producer has joined the Export Readiness Assessment waiting list:
      </p>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e7eb;">
        <h3 style="color: #333; margin-top: 0; margin-bottom: 15px; font-size: 18px;">Business Details</h3>
        
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 180px; color: #555;">Business Name:</td>
            <td style="padding: 8px 0; color: #333;">${data.businessName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Contact Name:</td>
            <td style="padding: 8px 0; color: #333;">${data.contactName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Email:</td>
            <td style="padding: 8px 0;">
              <a href="mailto:${data.email}" style="color: #f97316; text-decoration: none;">${data.email}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Country:</td>
            <td style="padding: 8px 0; color: #333;">${data.country}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Product Category:</td>
            <td style="padding: 8px 0; color: #333;">${data.productCategory}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #555;">Export Interest:</td>
            <td style="padding: 8px 0; color: #333;">${data.exportInterest}</td>
          </tr>
        </table>
      </div>
      
      <p style="margin-top: 20px; font-size: 14px; color: #777; line-height: 1.6;">
        This producer is interested in the Export Readiness Assessment and should be prioritized for onboarding when available.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
};
