import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const PhoneVerificationPage = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate('/connect-bank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center px-6">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white mb-2">
            Phone Verification
          </h1>
          <p className="text-white/80 text-sm">
            This is a placeholder page for phone verification
          </p>
        </div>

        <div className="space-y-6">
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-200 text-sm text-center">
              🎉 Bank connection successful! Phone verification will be implemented next.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleBack}
            variant="ghost"
            className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
            size="lg"
          >
            Back to Bank Connection
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PhoneVerificationPage;