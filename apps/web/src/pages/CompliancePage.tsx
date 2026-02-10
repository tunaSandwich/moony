import consentUnchecked from '@/assets/images/twilioCompliance/consent-unchecked.png';
import consentChecked from '@/assets/images/twilioCompliance/consent-checked.png';

const CompliancePage = () => {
  return (
    <div className="min-h-screen bg-pink-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SMS Consent Compliance
            </h1>
            <p className="text-gray-600 text-sm">
              CTIA-compliant SMS consent disclosure screenshots
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Unchecked Consent State */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 text-center">
                Consent Checkbox Unchecked
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <img
                  src={consentUnchecked}
                  alt="SMS consent checkbox unchecked state"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </div>

            {/* Checked Consent State */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 text-center">
                Consent Checkbox Checked
              </h2>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <img
                  src={consentChecked}
                  alt="SMS consent checkbox checked state"
                  className="w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompliancePage;
