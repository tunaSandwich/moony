import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/Button/Button';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import phoneImage from '@/assets/images/hand_and_phone.png';
import logoText from '@/assets/icons/logo_text.png';
import logo from '@/assets/icons/logo.png';

const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoaded, setIsLoaded] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);
  const { getTextAnimationProps, getHeaderBlurProps } = useScrollAnimation();

  const handleGetStarted = () => {
    navigate('/invite');
  };

  useEffect(() => {
    // Trigger page load animations
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FCE7F3'}}>
      {/* Logo in top-left corner */}
      <div className="absolute top-6 left-20 z-20">
        <img 
          src={logoText} 
          alt="Budget Pal Logo" 
          className="w-20 h-auto"
        />
      </div>

      {/* Progressive Blur Header */}
      <header 
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-10 h-20"
        style={getHeaderBlurProps()}
      >

      </header>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-start min-h-screen px-4 sm:px-6 pt-24 pb-8">
        <div className="text-center max-w-5xl mx-auto">
          {/* Main Heading */}
          <h1 
            className={`text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold text-gradient mb-4 sm:mb-6 leading-tight transition-all duration-700 ease-out ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={getTextAnimationProps(0.8)}
          >
            Fix your spending habits.
          </h1>
          
          {/* Subtitle */}
          <p 
            className={`text-lg sm:text-xl md:text-2xl lg:text-3xl text-gradient mb-8 sm:mb-12 font-light leading-relaxed transition-all duration-700 ease-out delay-100 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            style={getTextAnimationProps(0.6)}
          >
            Simple daily texts keeps you on budget.
          </p>
          
          {/* CTA Button - No scroll effects */}
          <div className={`mb-12 sm:mb-16 md:mb-20 transition-all duration-700 ease-out delay-200 ${
            isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}>
            <Button
              onClick={handleGetStarted}
              variant="primary"
              size="xl"
              className="bg-transparent text-black border border-black px-8 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl transition-all duration-300 min-h-[56px] touch-manipulation"
            >
              Try it free
            </Button>
          </div>
        </div>

        {/* iPhone Mockup - positioned strategically below button with 80px gap */}
        <div className="relative mt-20">
          <div 
            className={`transition-all duration-1000 ease-out delay-600 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
            }`}
          >
            <div className="relative flex justify-center">
              <img
                src={phoneImage}
                alt="Budget tracking on mobile"
                className="w-full max-w-4xl h-auto mx-auto relative z-10 phone-fade-mask"
                style={{ 
                  maxWidth: '1472px',
                  width: 'min(90vw, 1472px)'
                }}
                loading="lazy"
              />
              {/* Subtle glow effect behind phone */}
              <div className="absolute inset-0 bg-coral-300 opacity-20 blur-3xl scale-110 -z-10"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <footer className="relative z-10 py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Description */}
          <p className="text-lg sm:text-xl text-gray-700 mb-8 leading-relaxed">
            Connect your bank, connect your phone, set your spending goal and get daily sms updates tracking your progress
          </p>
          
          {/* Logo */}
          <div className="mb-8">
            <img 
              src={logo} 
              alt="Budget Pal Logo" 
              className="w-16 h-16 mx-auto"
            />
          </div>
          
          {/* Privacy Links */}
          <div className="flex justify-center items-center space-x-4 text-sm text-gray-600">
            <a href="#" className="hover:text-gray-800 transition-colors">PRIVACY POLICY</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-800 transition-colors">TERMS OF SERVICE</a>
            <span>|</span>
            <a href="#" className="hover:text-gray-800 transition-colors">LICENSE AGREEMENT</a>
          </div>
        </div>
      </footer>

      {/* Background decorative elements */}
      <div className="absolute top-20 left-4 sm:left-10 w-16 sm:w-20 h-16 sm:h-20 bg-coral-300 rounded-full opacity-20 blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-4 sm:right-10 w-24 sm:w-32 h-24 sm:h-32 bg-coral-400 rounded-full opacity-15 blur-2xl animate-pulse delay-1000"></div>
      <div className="absolute top-1/3 right-8 sm:right-20 w-12 sm:w-16 h-12 sm:h-16 bg-coral-200 rounded-full opacity-25 blur-lg animate-pulse delay-500"></div>
    </div>
  );
};

export default LandingPage;
