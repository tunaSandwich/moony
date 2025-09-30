import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const TermsOfServicePage = () => {
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
              Terms of Service
            </h1>
            <p className="text-white/80 text-sm">
              moony - Daily Spending Notifications
            </p>
          </div>

          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-6 text-white/90 space-y-6 max-h-96 overflow-y-auto">
            
            <section>
              <h2 className="text-xl font-semibold text-white mb-3">1. Service Description</h2>
              <p className="text-sm leading-relaxed">
                moony provides automated daily spending notifications and monthly budget tracking services via SMS messaging. 
                Our service connects to your bank account through Plaid to analyze your spending patterns and provide personalized budget alerts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">2. SMS Services Agreement</h2>
              <p className="text-sm leading-relaxed mb-3">
                By using moony's SMS services, you agree to receive:
              </p>
              <ul className="text-sm space-y-1 ml-4">
                <li>• Daily spending notifications and budget updates</li>
                <li>• Monthly budget summaries and goal reminders</li>
                <li>• Service-related messages and account notifications</li>
                <li>• Message frequency: 1-2 messages per day</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3">
                <strong>Message and data rates may apply.</strong> Your mobile carrier's messaging rates will apply to all SMS messages sent and received.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">3. Opt-Out Instructions</h2>
              <p className="text-sm leading-relaxed">
                You may opt out of SMS services at any time by:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• Replying <strong>STOP</strong> to any SMS message</li>
                <li>• Contacting customer support</li>
                <li>• Updating your preferences in your account settings</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3">
                For help with SMS services, reply <strong>HELP</strong> to any message or visit our support page.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">4. Financial Data</h2>
              <p className="text-sm leading-relaxed">
                moony uses Plaid to securely connect to your bank account. We only access transaction data necessary to provide spending analysis and budget tracking. 
                We do not store your banking credentials and cannot initiate transactions from your accounts.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">5. Privacy and Data Protection</h2>
              <p className="text-sm leading-relaxed">
                Your privacy is important to us. Please review our Privacy Policy for detailed information about how we collect, use, and protect your personal and financial information.
                We do not sell or share your personal data with third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">6. Service Availability</h2>
              <p className="text-sm leading-relaxed">
                moony is provided "as is" without warranties. We strive for 99% uptime but cannot guarantee uninterrupted service. 
                SMS delivery depends on your carrier's network and may be delayed or fail to deliver.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">7. Account Termination</h2>
              <p className="text-sm leading-relaxed">
                You may terminate your moony account at any time. Upon termination, we will stop sending SMS messages and delete your financial data within 30 days, 
                except as required by law or for legitimate business purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">8. Contact Information</h2>
              <p className="text-sm leading-relaxed">
                For questions about these Terms of Service or our SMS services:
              </p>
              <ul className="text-sm space-y-1 ml-4 mt-2">
                <li>• Email: gonzalezgarza.lucas@gmail.com</li>
                <li>• SMS: Reply HELP to any message</li>
                <li>• Web: Visit our support page</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mb-3">9. Changes to Terms</h2>
              <p className="text-sm leading-relaxed">
                We may update these Terms of Service from time to time. We will notify you of significant changes via SMS or email. 
                Continued use of moony after changes indicates acceptance of the updated terms.
              </p>
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

export default TermsOfServicePage;
