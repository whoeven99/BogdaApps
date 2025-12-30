import { useNavigate } from "@remix-run/react";
import { useState } from "react";

const Index = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: 'Starter',
      monthlyPrice: '$29',
      yearlyPrice: '$290',
      features: ['Up to 5 active offers', '1,000 orders/month', 'Basic analytics', 'Email support']
    },
    {
      name: 'Professional',
      monthlyPrice: '$79',
      yearlyPrice: '$790',
      popular: true,
      features: ['Up to 20 active offers', '10,000 orders/month', 'Advanced analytics', 'A/B testing', 'Priority support']
    },
    {
      name: 'Enterprise',
      monthlyPrice: '$199',
      yearlyPrice: '$1,990',
      features: ['Unlimited offers', 'Unlimited orders', 'Custom analytics', 'A/B testing', 'Dedicated support', 'White label']
    }
  ];

  return (
    <div className="polaris-page">
      <div className="polaris-page__header">
        <div>
          <button className="polaris-button polaris-button--plain" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1 className="polaris-page__title">Pricing Plans</h1>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h2 className="polaris-text-heading-lg" style={{ marginBottom: '8px' }}>
          Choose the perfect plan for your business
        </h2>
        <p className="polaris-text-subdued">All plans include 14-day free trial. No credit card required.</p>

        {/* Billing Cycle Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '24px'
        }}>
          <span style={{
            fontSize: '14px',
            fontWeight: billingCycle === 'monthly' ? 600 : 400,
            color: billingCycle === 'monthly' ? '#202223' : '#6d7175'
          }}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
            style={{
              position: 'relative',
              width: '52px',
              height: '28px',
              backgroundColor: billingCycle === 'yearly' ? '#008060' : '#c4cdd5',
              border: 'none',
              borderRadius: '14px',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
              padding: 0
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: '2px',
                left: billingCycle === 'yearly' ? '26px' : '2px',
                width: '24px',
                height: '24px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
              }}
            />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              fontSize: '14px',
              fontWeight: billingCycle === 'yearly' ? 600 : 400,
              color: billingCycle === 'yearly' ? '#202223' : '#6d7175'
            }}>
              Yearly
            </span>
            <span style={{
              backgroundColor: '#d1f7c4',
              color: '#108043',
              fontSize: '12px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px'
            }}>
              Save 17%
            </span>
          </div>
        </div>
      </div>

      <div className="polaris-grid grid grid-cols-1 md:grid-cols-3 gap-[16px] sm:gap-[24px]">
        {plans.map((plan, index) => (
          <div
            key={index}
            className="polaris-card"
            style={{
              border: plan.popular ? '2px solid #008060' : 'none',
              position: 'relative'
            }}
          >
            {plan.popular && (
              <div style={{
                position: 'absolute',
                top: '-12px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#008060',
                color: 'white',
                padding: '4px 16px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600
              }}>
                MOST POPULAR
              </div>
            )}

            <div className="polaris-stack polaris-stack--vertical" style={{ textAlign: 'center' }}>
              <h3 className="polaris-text-heading-md">{plan.name}</h3>
              <div style={{ margin: '16px 0' }}>
                <span style={{ fontSize: '36px', fontWeight: 600 }}>
                  {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                </span>
                <span className="polaris-text-subdued">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
                {billingCycle === 'yearly' && (
                  <div style={{
                    fontSize: '12px',
                    color: '#108043',
                    marginTop: '4px',
                    fontWeight: 500
                  }}>
                    ${(parseInt(plan.yearlyPrice.replace(/[$,]/g, '')) / 12).toFixed(0)}/month billed annually
                  </div>
                )}
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '24px 0', textAlign: 'left' }}>
                {plan.features.map((feature, i) => (
                  <li key={i} style={{ padding: '8px 0', fontSize: '14px' }}>
                    ✓ {feature}
                  </li>
                ))}
              </ul>

              <button
                className="polaris-button"
                style={{ width: '100%', marginTop: 'auto' }}
              >
                Start Free Trial
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="polaris-card" style={{ marginTop: '40px' }}>
        <h2 className="polaris-text-heading-md" style={{ marginBottom: '16px' }}>Frequently Asked Questions</h2>
        <div className="polaris-stack polaris-stack--vertical">
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Can I change plans later?</h3>
            <p className="polaris-text-subdued">Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>What happens after the trial?</h3>
            <p className="polaris-text-subdued">After your 14-day trial, you'll be charged based on your selected plan. You can cancel anytime.</p>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>Do you offer refunds?</h3>
            <p className="polaris-text-subdued">Yes, we offer a 30-day money-back guarantee for all plans.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
