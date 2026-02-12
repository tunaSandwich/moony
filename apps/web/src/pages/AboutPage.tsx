import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const AboutPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-pink-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              About moony
            </h1>
            <p className="text-gray-600 text-sm">
              Simple daily texts to keep you on budget.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 text-gray-700 space-y-6 border border-gray-100">

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">What is moony?</h2>
              <p className="text-sm leading-relaxed">
                moony is an SMS-based daily spending tracker. It connects to your bank account and sends you a 
                text message every day with a summary of your spending, so you can stay on top of your budget 
                without opening an app.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">How it works</h2>
              <p className="text-sm leading-relaxed mb-3">
                moony is designed to be simple and hands-free:
              </p>
              <ul className="text-sm space-y-2 ml-4">
                <li>
                  <strong>1. Connect your bank</strong> — moony uses{' '}
                  <a
                    href="https://plaid.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-900 transition-colors"
                  >
                    Plaid
                  </a>{' '}
                  to securely link to your bank account. We never see or store your banking credentials.
                </li>
                <li>
                  <strong>2. Set your budget</strong> — Choose a daily or monthly spending goal that works for you.
                </li>
                <li>
                  <strong>3. Get daily updates</strong> — Each day, moony checks your recent transactions and sends 
                  you an SMS with how much you've spent, how you're tracking against your goal, and your daily average.
                </li>
              </ul>
              <p className="text-sm leading-relaxed mt-3">
                You can reply to messages to interact with moony — check your balance, adjust your goal, or pause 
                notifications at any time. No app to open, no dashboard to check. Just a text.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Who operates moony?</h2>
              <p className="text-sm leading-relaxed">
                moony is built and operated by <strong>Lucas Garza</strong>, sole proprietor. If you have questions, 
                feedback, or need support, you can reach out at{' '}
                <a
                  href="mailto:gonzalezgarza.lucas@gmail.com"
                  className="underline hover:text-gray-900 transition-colors"
                >
                  gonzalezgarza.lucas@gmail.com
                </a>.
              </p>
            </section>

            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Privacy &amp; Security</h2>
              <p className="text-sm leading-relaxed">
                Your financial data is handled securely through Plaid's bank-level encryption. We do not sell 
                or share your personal information with third parties for marketing purposes. For full details, 
                see our{' '}
                <a href="/privacy" className="underline hover:text-gray-900 transition-colors">
                  Privacy Policy
                </a>{' '}
                and{' '}
                <a href="/terms" className="underline hover:text-gray-900 transition-colors">
                  Terms of Service
                </a>.
              </p>
            </section>

          </div>

          <div className="mt-6">
            <Button
              onClick={handleBack}
              variant="secondary"
              className="w-full bg-transparent text-black border border-black hover:bg-gray-50 rounded-lg font-medium"
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

export default AboutPage;
