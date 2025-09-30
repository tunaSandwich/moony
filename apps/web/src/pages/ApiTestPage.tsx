import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { authApi, twilioApi } from '@/api';

const ApiTestPage = () => {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testValidateInviteCode = async () => {
    setIsLoading(true);
    try {
      // Test with actual test data - you should replace with valid test values
      const response = await authApi.validateInviteCode('ABC123', '+15551234567');
      addResult(`✅ Auth Success: ${response.user.firstName} ${response.user.lastName}`);
      addResult(`📱 Phone: ${response.user.phoneNumber} (${response.user.twilioStatus})`);
      addResult(`🏦 Bank Connected: ${response.user.hasConnectedBank}`);
    } catch (error) {
      addResult(`❌ Auth Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testSendVerificationCode = async () => {
    setIsLoading(true);
    try {
      const response = await twilioApi.sendVerificationCode();
      addResult(`✅ SMS Sent: ${response.message}`);
    } catch (error) {
      addResult(`❌ SMS Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const testVerifyPhoneNumber = async () => {
    setIsLoading(true);
    try {
      // Test with dummy code - replace with actual code for real testing
      const response = await twilioApi.verifyPhoneNumber('123456');
      addResult(`✅ Phone Verified: ${response.message} (Status: ${response.twilioStatus})`);
    } catch (error) {
      addResult(`❌ Verify Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-500 to-pink-200 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-xl border border-white/20">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-light text-white mb-2">
              API Integration Test
            </h1>
            <p className="text-white/80 text-sm">
              Test the frontend API connection to moony backend
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <h2 className="text-xl font-medium text-white mb-4">Test API Endpoints</h2>
              
              <div className="space-y-3">
                <Button
                  onClick={testValidateInviteCode}
                  disabled={isLoading}
                  className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg"
                  size="lg"
                >
                  Test Auth: Validate Invite Code
                </Button>

                <Button
                  onClick={testSendVerificationCode}
                  disabled={isLoading}
                  className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg"
                  size="lg"
                >
                  Test SMS: Send Verification Code
                </Button>

                <Button
                  onClick={testVerifyPhoneNumber}
                  disabled={isLoading}
                  className="w-full bg-white/20 text-white border-white/30 hover:bg-white/30 backdrop-blur-sm rounded-lg"
                  size="lg"
                >
                  Test SMS: Verify Phone Number
                </Button>

                <Button
                  onClick={clearResults}
                  variant="ghost"
                  className="w-full text-white/80 hover:text-white hover:bg-white/10 rounded-lg"
                  size="lg"
                >
                  Clear Results
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-medium text-white mb-4">API Results</h2>
              
              <div className="bg-black/20 rounded-lg p-4 h-96 overflow-y-auto">
                {results.length === 0 ? (
                  <p className="text-white/60 text-sm">No test results yet. Click a button to test the API.</p>
                ) : (
                  <div className="space-y-2">
                    {results.map((result, index) => (
                      <div key={index} className="text-white/90 text-sm font-mono">
                        {result}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-yellow-200 font-medium mb-2">Test Instructions:</h3>
            <ul className="text-yellow-200/80 text-sm space-y-1">
              <li>• Use invite code "ABC123" and phone "+15551234567" from test database</li>
              <li>• SMS tests require valid JWT token (login first)</li>
              <li>• Verification code test will fail without actual SMS code</li>
              <li>• Check browser console for detailed logs</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApiTestPage;
