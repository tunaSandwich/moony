import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const SUPPORT_EMAIL = 'gonzalezgarza.lucas@gmail.com';

const ContactPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleBack = () => {
    navigate(-1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subjectLine = subject || 'moony Support Request';
    const body = name ? `Hi, my name is ${name}.\n\n${message}` : message;
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectLine)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="min-h-screen bg-pink-bg py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Contact Us
            </h1>
            <p className="text-gray-600 text-sm">
              We're here to help. Reach out anytime.
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 text-gray-700 space-y-6 border border-gray-100">

            {/* Direct contact info */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Get in touch</h2>
              <div className="text-sm space-y-3">
                <div className="flex items-start">
                  <span className="font-semibold w-20 shrink-0">Email</span>
                  <a
                    href={`mailto:${SUPPORT_EMAIL}`}
                    className="underline hover:text-gray-900 transition-colors"
                  >
                    {SUPPORT_EMAIL}
                  </a>
                </div>
                <div className="flex items-start">
                  <span className="font-semibold w-20 shrink-0">SMS</span>
                  <span>Reply <strong>HELP</strong> to any moony message for instant support</span>
                </div>
              </div>
            </section>

            {/* Contact form */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">Send a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow"
                  />
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-gray-700 mb-1">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="What can we help with?"
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow"
                  />
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-gray-400">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    placeholder="Tell us more..."
                    className="w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow resize-vertical"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full bg-[#1E1E1E] text-[#FFF8FC] rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Send message
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  This will open your email client with the message pre-filled.
                </p>
              </form>
            </section>

            {/* SMS help callout */}
            <section className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-3">SMS Support</h2>
              <p className="text-sm leading-relaxed">
                Already a moony user? For quick help with your account, spending updates, or notification 
                preferences, just reply <strong>HELP</strong> to any moony text message. To stop receiving 
                messages at any time, reply <strong>STOP</strong>.
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

export default ContactPage;
