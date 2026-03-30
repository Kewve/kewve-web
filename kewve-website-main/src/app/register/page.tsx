'use client';

import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { titleFont, josefinRegular, josefinSemiBold } from '@/utils';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { requestRegistrationEmailConfirmation } from '@/actions/registrationFlow';
import { GDPR } from '@/lib/gdprCopy';

const TRADING_PLATFORM_TNC = `Terms and conditions for the Kewve Trading Platform
Kewve Ltd (Kewve) of Church Field Close, Mulhuddart. D15 KC9E. Ireland.

1. Use of the Kewve Trading Platform
1.1 Kewve provides the Kewve Trading Platform for business users only.
1.2 Kewve's privacy notice can be accessed here: www.Kewve.com/privacy-policy and are included in and form part of these terms and conditions.
1.3 Kewve provides the Kewve Trading Platform, together with third party services such as those for payment, to facilitate transactions between purchasers and suppliers of goods.
1.4 Kewve's obligations apply only to transactions taking place through the Kewve Trading Platform.
1.5 By gaining access to or making use of the Kewve Trading Platform and / or any of the services provided by Kewve or Kewve's third party providers, such as payment, you agree to be bound by these terms and conditions and the terms specific to the services provided by the third-party providers. The payment provider's terms and conditions can be found here.
1.6 All users shall comply with all laws and regulations applicable to their business in the jurisdictions in which they operate.

2. Third-party services
2.1 Any use by you of third-party services offered through the Kewve Trading Platform is entirely at your own risk and it is your responsibility to read the terms and conditions and/or privacy policies applicable to such third-party services before using them.
2.2 You acknowledge and agree that Kewve shall have no liability arising out of or in connection with your use of third-party services.
2.2.1 If you use a third-party service, you grant Kewve permission to allow the provider of that service to gain access to your data and to take any other actions required for the interoperation of the third-party service with the Kewve Trading Platform.
2.2.2 You accept that any exchange of data or other interaction between you and the third-party provider is solely between you and them and that Kewve is not responsible for any disclosure, modification or deletion of your data or other materials, or for any corresponding losses or damages you may suffer, as a result of access by a third-party service or a third-party provider to your data or other materials.

3. These terms and conditions
3.1 Kewve may change these terms and conditions at any time, at will, without notice and you agree to be bound by the current version of the terms and conditions.
3.2 Kewve may change the services provided on the Kewve Trading Platform and these terms and conditions shall apply to the services as may be changed from time to time.
3.3 Kewve reserves the right to modify, discontinue, suspend, or terminate the Kewve Trading Platform and / or any third-party services, or your use of the Kewve Trading Platform and / or any third-party services for any reason, without notice at any time.
3.4 Kewve shall not be liable to you or to any third party for any such modification, discontinuance, suspension or termination.
3.5 These terms and conditions shall prevail over any other terms and conditions.

4. Kewve's role
4.1 Kewve facilitates the supply of goods through the Kewve Trading Platform but does not buy or sell them on its own behalf.
4.2 Kewve acts as agent for purchasers of the goods and has authority on behalf of purchasers to conclude contracts with suppliers as agent for the purchaser.
4.3 Kewve is not a party to these contracts and has no liability to either the purchaser or to the supplier under them.

5. How the Kewve Trading Platform works
5.1 Kewve receives purchasers' requirements for goods and will make these requirements available on the Kewve Trading Platform to suppliers.
5.2 Each purchaser will state its requirement for goods including, as appropriate, their quantity, quality, specification, and any applicable standard.
5.3 Offers to supply goods will be invited from suppliers and Kewve will notify the purchaser of offers received.
5.4 The essential commercial terms of each offer will be set out in the Kewve Trading Platform, including the description of the goods, their quantity, details of delivery, the price and payment terms. Purchaser acknowledges that the goods offered may not meet its requirements and that it is the purchaser's responsibility to review the offer and check that it meets purchaser's requirements before the offer is accepted.
5.5 The price of goods shown shall, unless otherwise specified, be inclusive of any applicable Value Added Tax (VAT).
5.6 The purchaser acknowledges that:
5.6.1 The information that Kewve receives concerning the rate and amount of VAT applicable to the transaction is provided to Kewve by the supplier.
5.6.2 Kewve does not check the accuracy of the information provided at clause 5.5 and Kewve does not warrant by relaying this information to the purchaser that the information is correct.
5.6.3 Kewve does not obtain information from the supplier regarding applicable duties.
5.6.4 Kewve is not responsible for determining whether (and if so at what rate) VAT or duties apply to the sale and accounting for and paying VAT and duties is the responsibility of the purchaser and supplier (as the case may be) according to the contract between them and the relevant laws in force governing the sale.
5.7 Kewve will use its reasonable endeavours to make available to each purchaser a summary of the supplier's terms and conditions of business.
5.8 Any contract between the purchaser and the supplier shall incorporate the commercial terms set out in the Kewve Trading Platform (such as description of the goods, price, payment and shipping terms) and the supplier's terms and conditions of business, which it is the purchaser's responsibility to review.
5.9 If an offer is approved by the purchaser, Kewve will inform the supplier of the purchaser's identity and conclude a contract for those goods between the purchaser and the supplier. Payment for the goods, together with any additional fees, commissions and taxes, shall be made through third party services embedded in or accessed through the Kewve Trading Platform. Duties shall be payable separately to the applicable authorities by the buyer or supplier in accordance with their contract.
5.10 Kewve does not promise to proceed with any transaction and may withdraw or change any requirement before any contract is concluded between the purchaser and supplier.
5.11 The supplier may withdraw an offer by giving notice to Kewve, provided notice is received by Kewve before the contract is concluded.
5.12 Suppliers are solely responsible for the accuracy and completeness of any information posted on the Kewve Trading Platform, including any offers prepared on supplier's behalf by Kewve, and supplier undertakes to check regularly that the information is current and to keep it up to date.
5.13 Suppliers are responsible for accurately describing products to be sold on the Kewve Trading Platform and ensuring that products described in their offer are available for sale at the time any contract with a purchaser is concluded.
5.14 Products supplied shall conform to their description and shall be fit for their intended purpose.
5.15 Kewve shall have no liability to either the supplier or the purchaser for any breach of contract for the sale of goods, nor have any interest in or responsibility for any dispute relating to that contract.
5.16 Kewve will charge the purchaser a commission on each sale to the purchaser made through the Kewve Trading Platform or where the introduction was made through Kewve.
5.17 Kewve will charge the supplier a fee for the use of the Kewve Trading Platform on each sale to the purchaser made through the Kewve Trading Platform or where the introduction was made through Kewve.
5.18 Supplier and purchaser hereby irrevocably authorise Kewve to deduct their commission and the fee for using the Kewve Trading Platform at the time of payment for the goods, or in the case of subscription fees, at the point of subscription.

6. Indemnity
The purchaser and the supplier shall indemnify Kewve against any liability incurred by Kewve in properly discharging its obligations under these terms and conditions, except to the extent that the liability arises as a result of the negligence of or breach of these terms and conditions by Kewve.

7. Survival
Any provision of these terms and conditions that expressly or by implication is intended to come into or continue in force on or after termination shall remain in full force and effect.

8. Compliance
Each party shall at its own expense comply with and assist the other party to comply with all laws and regulations relating to its activities in the Kewve Trading Platform, and with all and any conditions binding on it in any applicable licences, registrations, permits and approvals. Such laws shall include the Data Protection Legislation, the Bribery Act 2010, the Criminal Finances Act 2017 and the Modern Slavery Act 2015.

9. Limitation of liability
9.1 Unlimited liability. Nothing in these terms and conditions shall limit or exclude the liability of any party for:
9.1.1 Death or personal injury caused by its negligence, or the negligence of its employees, agents, or subcontractors (as applicable).
9.1.2 Fraud or fraudulent misrepresentation.
9.1.3 Any matter in respect of which it would be unlawful to exclude or restrict liability.

9.2 Limitations of liability. Subject to the provisions on unlimited liability:
9.2.1 Kewve shall not under any circumstances whatever be liable, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, for:
9.2.1.1 any loss of profit, revenue, or anticipated savings; or
9.2.1.2 any loss that is an indirect or secondary consequence of any act or omission of any other party.
9.2.2 Kewve's total liability in respect of all other loss or damage arising under or in connection with the Kewve Trading Platform, whether in contract, tort (including negligence), breach of statutory duty, or otherwise, shall in no circumstances exceed the amount paid to Kewve in commission and /or fees by the party claiming such loss or damage in respect of the transaction or transactions which form the subject of the claims.

10. General
10.1 Force majeure.
No party shall be in breach of agreement nor liable for delay in performing, or failure to perform, any of its obligations hereunder affected by the event if such delay or failure result from events, circumstances or causes beyond its reasonable control. In such an event the affected party shall be entitled to a reasonable extension of the time for performing such obligations. If the period of delay or non-performance continues for 60 days, the party not affected by the event may terminate this agreement or any contract with Kewve affected by the event by giving 14 days written notice to the affected party.
10.2 Intellectual property.
All information, data and copyright material contained on this platform, including any trade marks (whether officially registered or unregistered), trade names, brands, logos, and devices belong to Kewve or to people who we have given Kewve permission to use them. You must not use such information, data, or copyright material unless you have Kewve's written permission to do so.

11. Confidentiality
11.1 Each party undertakes that it shall not disclose to any person any confidential information concerning the business, affairs, customers, clients or suppliers of the other, except as permitted below.
11.2 Each party may disclose the other party's confidential information:
11.2.1 to its employees, officers, representatives, subcontractors (including third party service providers) or advisers who need to know such information for the purposes of exercising the party's rights or carrying out its obligations under this agreement. Each party shall ensure that its employees, officers, representatives, subcontractors (including third party service providers) or advisers to whom it discloses the other party's confidential information comply with this; and
11.2.2 as may be required by law, a court of competent jurisdiction or any governmental or regulatory authority.
11.3 No party shall use any other party's confidential information for any purpose other than to exercise its rights and perform its obligations under or in connection with this agreement.

12. Entire agreement
12.1 This agreement and any documents referred to in it constitutes the entire agreement between the parties and supersedes and extinguishes all previous agreements, promises, assurances, warranties, representations and understandings between them, whether written or oral, relating to its subject matter.
12.2 Each party agrees that it shall have no remedies in respect of any statement, representation, assurance or warranty (whether made innocently or negligently) that is not set out in this agreement. Each party agrees that it shall have no claim for innocent or negligent misrepresentation or negligent misstatement based on any statement in this agreement.

13. Variation
Kewve may change these terms and conditions and the services in accordance with clause 3, but no variation of this agreement by any other party shall be effective unless it is in writing and signed by the parties (or their authorised representatives).

14. Waiver
No failure or delay by a party to exercise any right or remedy provided under this agreement or by law shall constitute a waiver of that or any other right or remedy, nor shall it prevent or restrict the further exercise of that or any other right or remedy. No single or partial exercise of such right or remedy shall prevent or restrict the further exercise of that or any other right or remedy.

15. Severance
15.1 If any provision or part-provision of this agreement is or becomes invalid, illegal or unenforceable, it shall be deemed deleted, but that shall not affect the validity and enforceability of the rest of this agreement.
15.2 If any provision or part-provision of this agreement is deemed deleted, the parties shall negotiate in good faith to agree a replacement provision that, to the greatest extent possible, achieves the intended commercial result of the original provision.

16. Notices
16.1 All communications shall be by email or made through the Kewve Trading Platform.
16.2 This clause shall not apply to the service of any proceedings or other documents in any legal action, arbitration, or other method of dispute resolution.

17. No partnership, joint venture or agency
17.1 Nothing in this agreement is intended to, or shall be deemed to, establish any partnership or joint venture between any of the parties, constitute any party the agent of another party (except to the limited extent set out expressly in these terms and conditions), or authorise any party to make or enter into any commitments for or on behalf of any other party except as expressly provided in these terms and conditions.
17.2 Each party confirms that, in entering into and discharging its obligations under this agreement, it is acting on its own behalf and not for the benefit of any other person.

18. Governing law
This agreement and any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with it or its subject matter or formation shall be governed by and construed in accordance with the law of Republic of Ireland.

19. Jurisdiction
Each party irrevocably agrees that the courts of Republic of Ireland shall have exclusive jurisdiction to settle any dispute or claim (including non-contractual disputes or claims) arising out of or in connection with this agreement or its subject matter or formation.`;

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    country: '',
    discountCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [acceptedTnc, setAcceptedTnc] = useState(false);
  const [acceptedPrivacyGdpr, setAcceptedPrivacyGdpr] = useState(false);
  const [tncExpanded, setTncExpanded] = useState(false);
  const { toast } = useToast();

  const checkEmailExists = async (email: string) => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setEmailError('');
      return;
    }
    setCheckingEmail(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/auth/check-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && data.data?.exists) {
        setEmailError('An account with this email already exists.');
      } else {
        setEmailError('');
      }
    } catch {
      setEmailError('');
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Error',
        description: 'Passwords do not match.',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: 'Error',
        description: 'Password must be at least 6 characters.',
        variant: 'destructive',
      });
      return;
    }

    if (emailError) {
      toast({
        title: 'Error',
        description: emailError,
        variant: 'destructive',
      });
      return;
    }

    if (!acceptedPrivacyGdpr) {
      toast({
        title: 'Consent required',
        description: 'Please confirm your agreement to how we collect and use your information.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const result = await requestRegistrationEmailConfirmation({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        businessName: formData.businessName || undefined,
        country: formData.country || undefined,
        discountCode: formData.discountCode || undefined,
      });

      if (!result.success) {
        toast({
          title: 'Unable to send confirmation email',
          description: result.error || 'Please try again.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      setConfirmationSent(true);
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        businessName: '',
        country: '',
        discountCode: '',
      });
      setEmailError('');
      setAcceptedTnc(false);
      setAcceptedPrivacyGdpr(false);
      setTncExpanded(false);
      toast({
        title: 'Check your email',
        description: 'Please confirm your email address first. Payment starts only after confirmation.',
      });
      setLoading(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className='overflow-x-hidden min-h-screen flex flex-col'>
      <Header />
      <div className='flex-grow bg-gradient-to-br from-orange via-yellow to-orange flex items-center justify-center pt-24 lg:pt-32 pb-16 px-4'>
        <div className='w-full max-w-md'>
          <div className='bg-white rounded-lg shadow-lg p-8'>
            <h1 className={`text-3xl font-bold text-black mb-2 ${titleFont.className}`}>
              Create Account
            </h1>
            <p className={`text-sm text-black/70 mb-6 ${josefinRegular.className}`}>
              Register to start your export readiness assessment
            </p>

            <form onSubmit={handleSubmit} className='space-y-6'>
              <div>
                <Label htmlFor='name' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Full Name *
                </Label>
                <Input
                  type='text'
                  id='name'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='Your full name'
                />
              </div>

              <div>
                <Label htmlFor='email' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Email address *
                </Label>
                <Input
                  type='email'
                  id='email'
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (emailError) setEmailError('');
                  }}
                  onBlur={(e) => checkEmailExists(e.target.value)}
                  required
                  className={`bg-white ${emailError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'}`}
                  placeholder='your@email.com'
                />
                {checkingEmail && (
                  <p className={`text-xs text-gray-500 mt-1 ${josefinRegular.className}`}>
                    Checking email...
                  </p>
                )}
                {emailError && !checkingEmail && (
                  <p className={`text-xs text-red-600 mt-1 ${josefinRegular.className}`}>
                    {emailError}{' '}
                    <Link href='/login' className='underline font-semibold'>
                      Log in here
                    </Link>
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor='businessName' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Business Name (Optional)
                </Label>
                <Input
                  type='text'
                  id='businessName'
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className='bg-white border-gray-300'
                  placeholder='Your business name'
                />
              </div>

              <div>
                <Label htmlFor='country' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Country (Optional)
                </Label>
                <Input
                  type='text'
                  id='country'
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className='bg-white border-gray-300'
                  placeholder='Your country'
                />
              </div>

              <div>
                <Label htmlFor='discountCode' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Discount Code (Optional)
                </Label>
                <Input
                  type='text'
                  id='discountCode'
                  value={formData.discountCode}
                  onChange={(e) => setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })}
                  className='bg-white border-gray-300 uppercase'
                  placeholder='Enter code'
                />
              </div>

              <div>
                <Label htmlFor='password' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Password *
                </Label>
                <Input
                  type='password'
                  id='password'
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='At least 6 characters'
                />
              </div>

              <div>
                <Label htmlFor='confirmPassword' className={`text-black mb-2 block ${josefinRegular.className}`}>
                  Confirm Password *
                </Label>
                <Input
                  type='password'
                  id='confirmPassword'
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  className='bg-white border-gray-300'
                  placeholder='Confirm your password'
                />
              </div>

              {confirmationSent && (
                <div className='rounded-md border border-green-300 bg-green-50 px-4 py-3'>
                  <p className={`text-sm text-green-800 ${josefinRegular.className}`}>
                    Confirmation email sent. Open your inbox and click the link to continue to payment.
                  </p>
                </div>
              )}

              <div className='rounded-md border-2 border-red-300 bg-red-50 px-4 py-3'>
                <p className={`text-sm font-bold text-red-800 ${josefinSemiBold.className}`}>
                  If products contain animal or seafood ingredients, they are not eligible for Kewve.
                </p>
              </div>

              <div className='rounded-md border border-gray-300 bg-white'>
                <button
                  type='button'
                  onClick={() => setTncExpanded((prev) => !prev)}
                  className='w-full px-4 py-3 border-b border-gray-200 flex items-center justify-between text-left'>
                  <p className={`text-sm text-black ${josefinSemiBold.className}`}>Terms and Conditions for the Kewve Trading Platform</p>
                  <span className={`text-sm text-black transition-transform ${tncExpanded ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {tncExpanded && (
                  <div className='max-h-64 overflow-y-auto px-4 py-3'>
                    <pre className={`whitespace-pre-wrap text-xs text-black/80 leading-relaxed ${josefinRegular.className}`}>
                      {TRADING_PLATFORM_TNC}
                    </pre>
                  </div>
                )}
              </div>

              <label className='flex items-start gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={acceptedTnc}
                  onChange={(e) => setAcceptedTnc(e.target.checked)}
                  className='mt-1 h-4 w-4 rounded border-gray-300 accent-[#ed722d]'
                />
                <span className={`text-sm text-black ${josefinRegular.className}`}>
                  I have read and agree to the Terms and Conditions for the Kewve Trading Platform.
                </span>
              </label>

              <label className='flex items-start gap-3 cursor-pointer'>
                <input
                  type='checkbox'
                  checked={acceptedPrivacyGdpr}
                  onChange={(e) => setAcceptedPrivacyGdpr(e.target.checked)}
                  className='mt-1 h-4 w-4 rounded border-gray-300 accent-[#ed722d]'
                />
                <span className={`text-sm text-black ${josefinRegular.className}`}>
                  {(() => {
                    const [before, after] = GDPR.registration.split('Privacy Policy');
                    return (
                      <>
                        {before}
                        <Link href='/privacy' className='text-orange underline font-semibold'>
                          Privacy Policy
                        </Link>
                        {after}
                      </>
                    );
                  })()}
                </span>
              </label>

              <button
                type='submit'
                disabled={loading || !!emailError || checkingEmail || !acceptedTnc || !acceptedPrivacyGdpr}
                className={`w-full bg-black text-white border-2 border-black rounded-full py-3 px-6 text-base font-semibold transition-all text-center hover:bg-muted-orange hover:border-muted-orange disabled:opacity-50 disabled:cursor-not-allowed ${josefinSemiBold.className}`}>
                {loading ? 'Sending confirmation email...' : 'Confirm Email to Continue'}
              </button>
            </form>

            <p className={`text-sm text-center mt-6 text-black/70 ${josefinRegular.className}`}>
              Already have an account?{' '}
              <Link href='/login' className='text-black font-semibold hover:underline'>
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
      <section className='bg-orange relative pb-10'>
        <Footer />
      </section>
    </div>
  );
}
