import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const STEPS = [
  {
    number: '1',
    icon: '🔑',
    title: 'Sign up with an invite code',
    description:
      'Enter your invite code and phone number to create your moony account. Currently in early access — you can request an invite from the homepage.',
  },
  {
    number: '2',
    icon: '🏦',
    title: 'Connect your bank securely',
    description:
      'Link your bank account through Plaid, the same secure service used by Venmo, Cash App, and thousands of other financial apps. moony never sees or stores your banking password.',
  },
  {
    number: '3',
    icon: '📱',
    title: 'Verify your phone number',
    description:
      'Confirm your phone number with a one-time verification code. You\'ll also review and consent to receiving daily SMS notifications before anything is sent.',
  },
  {
    number: '4',
    icon: '🎯',
    title: 'Set your monthly spending goal',
    description:
      'Choose a monthly budget that works for you. moony uses this to calculate your daily allowance and track how you\'re doing throughout the month.',
  },
  {
    number: '5',
    icon: '💬',
    title: 'Get daily SMS updates',
    description:
      'Every day, moony checks your recent bank transactions and texts you a summary: how much you\'ve spent today, your monthly total so far, your daily average, and how much budget you have left.',
  },
  {
    number: '6',
    icon: '💡',
    title: 'Reply to interact',
    description:
      'Text back to check your balance, adjust your goal, or get a quick summary anytime. No app to open — everything happens over SMS.',
  },
];

const HowItWorksPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/invite');
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="min-h-screen bg-pink-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              How moony works
            </h1>
            <p className="text-gray-600 text-sm">
              A daily spending tracker that lives in your text messages.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-6 mb-10">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-4 bg-gray-50 border border-gray-200 rounded-xl p-5"
              >
                {/* Step number + icon */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                  <span className="text-3xl" role="img" aria-hidden="true">
                    {step.icon}
                  </span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Step {step.number}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 mb-1">
                    {step.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Sample message preview */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 text-center">
              What a daily update looks like
            </h2>
            <div className="max-w-sm mx-auto bg-gray-50 border border-gray-200 rounded-2xl p-5">
              <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-gray-100">
                <p className="text-sm leading-relaxed text-gray-800 font-mono whitespace-pre-line">
{`Good morning! Here's your daily spending update:

Yesterday: $42.17
Monthly total: $847.30 of $2,000
Daily avg: $70.61
Remaining: $1,152.70 (17 days left)

You're under budget. Keep it up! 🎉`}
                </p>
              </div>
              <p className="text-xs text-gray-400 text-center mt-3">
                Example message — your actual numbers will vary
              </p>
            </div>
          </div>

          {/* Opt-out info */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-8">
            <h2 className="text-base font-semibold text-gray-900 mb-2">
              You're always in control
            </h2>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li>
                <strong>STOP</strong> — Reply STOP to any moony message to unsubscribe instantly. No questions asked.
              </li>
              <li>
                <strong>HELP</strong> — Reply HELP for support information at any time.
              </li>
              <li>
                <strong>Message frequency:</strong> 1–2 messages per day. Msg &amp; data rates may apply.
              </li>
            </ul>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <Button
              onClick={handleGetStarted}
              variant="primary"
              size="lg"
              className="w-full bg-[#1E1E1E] text-[#FFF8FC] rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get started
            </Button>
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

export default HowItWorksPage;
