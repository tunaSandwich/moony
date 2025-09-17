import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const LandingPage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/invite');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 flex items-center justify-center">
      <div className="text-center text-white px-6">
        <h1 className="text-5xl md:text-6xl font-light mb-4 tracking-wide">
          Stay on <span className="font-semibold">budget</span>
        </h1>
        
        <p className="text-xl md:text-2xl font-light mb-12 opacity-90">
          Daily pulse on spending
        </p>
        
        <Button
          onClick={handleGetStarted}
          variant="secondary"
          size="lg"
          className="bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm px-8 py-3 rounded-full font-medium"
        >
          Get Started
        </Button>
      </div>
    </div>
  );
};

export default LandingPage;