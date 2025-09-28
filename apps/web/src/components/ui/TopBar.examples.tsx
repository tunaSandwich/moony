import React from 'react';
import { TopBar, withTopBar } from './TopBar';

// Example usage demonstrations

/**
 * CSS-Only Examples
 */
export const CSSExamples = () => (
  <div className="space-y-6">
    <h2>CSS-Only Implementation</h2>
    
    {/* Basic card with top bar */}
    <div className="top-bar bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md shadow-xl border border-white/20">
      <h3 className="text-xl font-semibold mb-4">Budget Summary</h3>
      <p>Your spending this month: $1,234.56</p>
    </div>

    {/* Modal with inherited radius */}
    <div className="top-bar inherit-radius bg-white rounded-lg p-6 shadow-lg max-w-sm">
      <h3 className="text-lg font-medium mb-2">Transaction Alert</h3>
      <p className="text-sm text-gray-600">New transaction detected</p>
    </div>

    {/* Container with no radius */}
    <div className="top-bar no-radius bg-gray-100 p-4 border">
      <h3>Flat Container</h3>
      <p>No border radius on this container</p>
    </div>
  </div>
);

/**
 * React Component Examples
 */
export const ReactExamples = () => (
  <div className="space-y-6">
    <h2>React Component Implementation</h2>
    
    {/* Overlay usage (default) */}
    <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md shadow-xl border border-white/20">
      <TopBar />
      <h3 className="text-xl font-semibold mb-4">Budget Overview</h3>
      <div className="space-y-2">
        <p>Monthly Budget: $3,000</p>
        <p>Spent: $1,234.56</p>
        <p>Remaining: $1,765.44</p>
      </div>
    </div>

    {/* Standalone usage */}
    <div className="max-w-md">
      <TopBar overlay={false} radiusMode="default" />
      <div className="bg-white p-6 rounded-b-2xl shadow-lg">
        <h3 className="text-lg font-medium mb-2">Account Balance</h3>
        <p className="text-2xl font-bold text-green-600">$5,432.10</p>
      </div>
    </div>

    {/* With inherited radius */}
    <div className="relative bg-white rounded-xl p-6 shadow-lg max-w-sm">
      <TopBar radiusMode="inherit" />
      <h3 className="text-lg font-medium mb-2">Recent Transaction</h3>
      <p className="text-sm text-gray-600">Starbucks Coffee - $4.95</p>
    </div>
  </div>
);

/**
 * HOC Usage Example
 */
const BudgetCard: React.FC<{ title: string; amount: string }> = ({ title, amount }) => (
  <div className="bg-white p-6 rounded-2xl shadow-lg">
    <h3 className="text-lg font-medium mb-2">{title}</h3>
    <p className="text-2xl font-bold">{amount}</p>
  </div>
);

const BudgetCardWithTopBar = withTopBar(BudgetCard, { radiusMode: 'inherit' });

export const HOCExample = () => (
  <div>
    <h2>Higher-Order Component Usage</h2>
    <BudgetCardWithTopBar title="Monthly Spending" amount="$1,234.56" />
  </div>
);

/**
 * Integration with your existing InviteCodePage styling
 */
export const InviteCodePageExample = () => (
  <div className="min-h-screen relative overflow-hidden" style={{backgroundColor: '#FFF8FC'}}>
    <div className="flex items-center justify-center px-6" style={{ paddingTop: '80px', minHeight: '100vh' }}>
      {/* Using CSS class approach */}
      <div className="top-bar bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-xl border border-white/20">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light mb-2" style={{ color: '#1E1E1E' }}>
            Welcome Back
          </h1>
          <p className="text-sm" style={{ color: '#1E1E1E', opacity: 0.8 }}>
            Your personalized budget dashboard
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="bg-white/50 rounded-lg p-4">
            <p className="text-sm text-gray-600">This Month's Spending</p>
            <p className="text-2xl font-bold" style={{ color: '#1E1E1E' }}>$1,234.56</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default {
  CSSExamples,
  ReactExamples,
  HOCExample,
  InviteCodePageExample
};