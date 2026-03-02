'use client';

import { poppinsRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

function Terms() {
  return (
    <>
      <Header needsBackground />
      <section className='relative bg-cream pt-16 lg:pt-28 pb-4'>
        <div className={`spacing container w-full lg:w-[60%] mx-auto terms ${poppinsRegular.className}`}>
          <div className='flex flex-col items-center'>
            <h2 className={`text-3xl text-black-muted text-center mb-2 ${josefinSemiBold.className}`}>
              KEWVE WEBSITE TERMS AND CONDITIONS
            </h2>
            <p>By Using Our Site You Accept These Terms and Conditions</p>
          </div>
          <p>
            Please read these Terms and Conditions carefully before using this website. These Terms and Conditions govern
            your use of all Kewve websites, platforms, tools, and services (together referred to as &ldquo;Our Site&rdquo;). It is
            recommended that you print a copy for your records.
          </p>
          <p>These Terms and Conditions were last updated on 22nd February 2026.</p>
          <p>
            Your access to or use of Our Site and any Kewve services constitutes acceptance of these Terms and
            Conditions.
          </p>
          <h2>1. Definitions and Interpretation</h2>
          <p>
            Content means all text, images, data, software, tools, assessments, reports, guidance materials, and other
            information made available on or through Our Site.
          </p>
          <p>
            <b>We / Us / Our</b> means Kewve Limited.
          </p>          
          <p>
            Services means digital export readiness tools, assessments, guidance, analytics, aggregation readiness, trade support
            services, and any related features provided by Kewve.
          </p>
          <h2>2. Information About Us</h2>
          <p>
            Our Site is operated by Kewve Limited, a company registered in the Republic of Ireland under company number
            725093.
          </p>
          <p>Registered and trading address: 6 Church Field Close, Mulhuddart, D15 KC9E, Ireland.</p>
          <h2>3. How to Contact Us</h2>
          <p>You can contact us by email at info@kewve.com or by telephone on +353 873636781.</p>
          <h2>4. Access to Our Site</h2>
          <ol>
            <li>Access to Our Site is provided free of charge unless otherwise stated.</li>
            <li>
              Certain services, including but not limited to export readiness assessments and structured trade support,
              may require registration and payment.
            </li>
            <li>
              Access is provided on an &lsquo;as is&rsquo; and &lsquo;as available&rsquo; basis. We may suspend, withdraw, or restrict
              availability of all or any part of Our Site for business or operational reasons.
            </li>
          </ol>
          <h2>5. Changes to Our Site</h2>
          <p>We may update or change Our Site, services, tools, or content at any time without notice.</p>
          <h2>6. Changes to These Terms</h2>
          <p>
            We may update these Terms and Conditions from time to time. Your continued use of Our Site following any
            changes constitutes acceptance of the updated terms.
          </p>
          <h2>7. Intellectual Property Rights</h2>
          <p>
            All Content on Our Site is owned by or licensed to Kewve and is protected by intellectual property laws.
          </p>
          <p>
            You may view, download, and print content for your internal business use only. You must not copy, reproduce,
            distribute, or exploit any Content for commercial purposes without prior written consent.
          </p>
          <h2>8. Use of Services</h2>
          <p>
            Kewve provides digital tools and services designed to support export readiness, trade preparation, and
            structured supply for food and beverage businesses.
          </p>
          <p>
            Kewve does not guarantee commercial outcomes, sales, contracts, or buyer engagement. All services are
            provided to support preparation and decision-making only.
          </p>
          <h2>9. Links to and from Our Site</h2>
          <p>You may link to Our Site provided it is done in a fair and lawful manner.</p>
          <p>
            Our Site may include links to third-party websites for information purposes. We are not responsible for the
            content or availability of those sites.
          </p>
          <h2>10. Disclaimers</h2>
          <p>
            Content on Our Site is provided for general information purposes only and does not constitute legal,
            financial, regulatory, or professional advice.
          </p>
          <p>
            Users remain responsible for ensuring compliance with applicable export, food safety, customs, and regulatory
            requirements.
          </p>
          <h2>11. Limitation of Liability</h2>
          <p>
            Nothing in these Terms limits liability for fraud, personal injury, or any liability that cannot be excluded
            under law.
          </p>
          <p>
            To the fullest extent permitted by law, Kewve shall not be liable for any indirect, consequential, or
            business-related losses arising from use of Our Site or Services.
          </p>
          <h2>12. Security and Misuse</h2>
          <p>
            You must not misuse Our Site by introducing malware, attempting unauthorised access, or disrupting services.
            Any such actions may result in immediate termination of access and reporting to authorities.
          </p>
          <h2>13. Acceptable Use</h2>
          <p>You must use Our Site lawfully and in compliance with all applicable laws and regulations.</p>
          <p>We reserve the right to suspend or terminate access for misuse or breach of these Terms.</p>
          <h2>14. Data Protection</h2>
          <p>We process personal data in accordance with our Privacy Policy and applicable data protection laws.</p>
          <h2>15. Governing Law and Jurisdiction</h2>
          <p>These Terms are governed by the laws of the Republic of Ireland.</p>
          <p>Any disputes shall be subject to the exclusive jurisdiction of the courts of the Republic of Ireland.</p>
        </div>
      </section>
      <section className='bg-orange'>
        <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 200'>
          <path
            fill='#fafaf0'
            d='M0,256L120,218.7C240,181,480,107,720,106.7C960,107,1200,181,1320,218.7L1440,256L1440,0L1320,0C1200,0,960,0,720,0C480,0,240,0,120,0L0,0Z'></path>
        </svg>
      </section>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </>
  );
}

export default Terms;
