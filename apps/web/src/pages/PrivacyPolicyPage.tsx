import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const PrivacyPolicyPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-white mb-2">
              Privacy Policy
            </h1>
            <p className="text-white/80 text-sm">
              moony - How We Protect Your Information
            </p>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-white/90 space-y-6 max-h-96 overflow-y-auto">
            
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Information We Collect</h2>
              <p className="text-sm leading-relaxed mb-3">
                moony collects the following types of information to provide our services:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <strong>Contact Information:</strong> Name, phone number, email address</li>
                <li>• <strong>Financial Data:</strong> Bank account transactions, spending patterns, account balances</li>
                <li>• <strong>Usage Data:</strong> App interactions, notification preferences, SMS responses</li>
                <li>• <strong>Device Information:</strong> Device type, operating system, app version</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. How We Use Your Information</h2>
              <p className="text-sm leading-relaxed mb-3">
                We use your information to:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Provide daily spending notifications and budget tracking</li>
                <li>• Calculate spending analytics and financial insights</li>
                <li>• Send SMS messages and notifications you've subscribed to</li>
                <li>• Improve our services and user experience</li>
                <li>• Comply with legal requirements and prevent fraud</li>
              </ul>
            </section>

            <section className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-white mb-3">3. Mobile Information Protection</h2>
              <p className="text-sm leading-relaxed font-medium">
                <strong>Mobile information will not be shared with third parties for marketing or promotional purposes.</strong>
              </p>
              <p className="text-sm leading-relaxed mt-2">
                Your mobile phone number and SMS preferences are strictly protected. We only use your mobile information to provide 
                the moony services you have explicitly requested, such as spending notifications and budget alerts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Financial Data Security</h2>
              <p className="text-sm leading-relaxed">
                Your financial data is protected through multiple layers of security:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• Bank connections secured through Plaid with bank-level encryption</li>
                <li>• Access tokens encrypted using industry-standard AES encryption</li>
                <li>• No storage of banking passwords or credentials</li>
                <li>• Regular security audits and monitoring</li>
                <li>• Compliance with financial data protection regulations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Data Sharing and Disclosure</h2>
              <p className="text-sm leading-relaxed mb-3">
                We do not sell, rent, or trade your personal information. We may share your information only in these limited circumstances:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• <strong>Service Providers:</strong> Plaid for bank connections, Twilio for SMS delivery</li>
                <li>• <strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li>• <strong>Business Transfers:</strong> In the event of a merger or acquisition</li>
                <li>• <strong>With Your Consent:</strong> When you explicitly authorize sharing</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3">
                All third-party service providers are bound by strict confidentiality agreements and data protection standards.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. SMS and Communication Privacy</h2>
              <p className="text-sm leading-relaxed">
                Regarding SMS and electronic communications:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• SMS messages are sent only to numbers you provide and verify</li>
                <li>• Message content is limited to financial summaries and service notifications</li>
                <li>• You can opt out of SMS services at any time by replying STOP</li>
                <li>• We do not store or analyze the content of your SMS replies beyond service functionality</li>
                <li>• Message logs are kept for operational purposes and regulatory compliance only</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Data Retention</h2>
              <p className="text-sm leading-relaxed">
                We retain your information for as long as necessary to provide services:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• Account data: Until you close your account plus 30 days</li>
                <li>• Financial transactions: 7 years for regulatory compliance</li>
                <li>• SMS logs: 90 days for operational purposes</li>
                <li>• Analytics data: Aggregated and anonymized data may be retained indefinitely</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Your Rights and Choices</h2>
              <p className="text-sm leading-relaxed mb-3">
                You have the right to:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Access and review your personal information</li>
                <li>• Correct inaccurate or incomplete data</li>
                <li>• Delete your account and associated data</li>
                <li>• Opt out of SMS notifications at any time</li>
                <li>• Export your data in a portable format</li>
                <li>• Withdraw consent for data processing where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Children's Privacy</h2>
              <p className="text-sm leading-relaxed">
                moony is not intended for use by children under 18. We do not knowingly collect personal information from children under 18. 
                If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">10. Changes to This Policy</h2>
              <p className="text-sm leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or legal requirements. 
                We will notify you of significant changes via email or SMS. Your continued use of moony after changes indicates acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">11. Contact Us</h2>
              <p className="text-sm leading-relaxed">
                If you have questions about this Privacy Policy or how we handle your information:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• Email: gonzalezgarza.lucas@gmail.com</li>
                <li>• Mail: moony Privacy Team</li>
                <li>• Phone: Reply HELP to any SMS message</li>
              </ul>
            </section>

            <p className="text-xs text-white/70 mt-6 pt-4 border-t border-white/20">
              Last updated: {new Date().toLocaleDateString()}
            </p>
          </div>

          <div className="mt-6">
            <Button
              onClick={handleBack}
              variant="secondary"
              className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg font-medium"
              size="lg"
            >
              Back
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
