import { useState } from 'react';
import { Button } from '@/components/ui/Button';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-primary">Budget Pal</h1>
            <Button variant="primary" size="md">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-16">
        {/* Hero Section */}
        <section className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Stay on top of your spending{' '}
            <span className="text-primary">without the hassle</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Get daily spending insights sent directly to your phone. No app checking required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="primary" size="lg">
              Get Started Free
            </Button>
            <Button variant="secondary" size="lg">
              Learn More
            </Button>
          </div>
        </section>

        {/* Demo Section */}
        <section className="mb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Simple Demo
              </h2>
              <p className="text-gray-600 mb-6">
                Click the button below to see our design system in action!
              </p>
              <div className="space-y-4">
                <Button 
                  onClick={() => setCount(count + 1)}
                  variant="primary"
                  size="lg"
                >
                  Count is {count}
                </Button>
                <div className="space-x-4">
                  <Button variant="secondary" size="md">
                    Secondary
                  </Button>
                  <Button variant="ghost" size="md">
                    Ghost
                  </Button>
                  <Button variant="danger" size="md">
                    Danger
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="card">
              <h3 className="text-xl font-semibold mb-4">Design System Preview</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-8 bg-primary rounded"></div>
                  <div className="h-8 bg-success rounded"></div>
                  <div className="h-8 bg-warning rounded"></div>
                </div>
                <p className="text-sm text-gray-600">
                  Built with Tailwind CSS, TypeScript, and modern React patterns.
                </p>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>React 19</span>
                    <span className="text-success">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TypeScript</span>
                    <span className="text-success">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tailwind CSS</span>
                    <span className="text-success">✓</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Vite</span>
                    <span className="text-success">✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-4xl mb-4">🏦</div>
            <h3 className="text-xl font-semibold mb-2">Bank Integration</h3>
            <p className="text-gray-600">
              Secure connection to your bank account via Plaid
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-xl font-semibold mb-2">SMS Notifications</h3>
            <p className="text-gray-600">
              Daily spending updates sent directly to your phone
            </p>
          </div>
          
          <div className="card text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold mb-2">Goal Tracking</h3>
            <p className="text-gray-600">
              Set monthly budgets and track your progress
            </p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="container py-8">
          <div className="text-center text-gray-600">
            <p>&copy; 2024 Budget Pal. Built with modern web technologies.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
