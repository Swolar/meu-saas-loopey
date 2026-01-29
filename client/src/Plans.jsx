import React from 'react';
import { Check, X, Zap, Crown, Shield } from 'lucide-react';

const PlanCard = ({ title, price, features, recommended, current, buttonText, buttonAction, themeColor }) => {
  return (
    <div style={{
      background: recommended 
        ? `linear-gradient(145deg, rgba(30, 30, 40, 0.9) 0%, rgba(20, 20, 30, 0.95) 100%)` 
        : 'rgba(255, 255, 255, 0.03)',
      border: recommended ? `1px solid ${themeColor}` : '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '2rem',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      flex: 1,
      minWidth: '300px',
      boxShadow: recommended ? `0 0 20px ${themeColor}20` : 'none',
      transform: recommended ? 'scale(1.02)' : 'scale(1)',
      zIndex: recommended ? 2 : 1
    }}>
      {recommended && (
        <div style={{
          position: 'absolute',
          top: '-12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: themeColor,
          color: '#fff',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          boxShadow: `0 4px 10px ${themeColor}40`
        }}>
          Recomendado
        </div>
      )}

      <div style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#fff' }}>{title}</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{price}</span>
          {price !== 'Grátis' && <span style={{ color: '#9ca3af' }}>/mês</span>}
        </div>
      </div>

      <div style={{ flex: 1, marginBottom: '2rem' }}>
        {features.map((feature, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', fontSize: '0.9rem', color: feature.included ? '#e5e7eb' : '#6b7280' }}>
            {feature.included ? (
              <div style={{ background: recommended ? themeColor : 'rgba(255,255,255,0.1)', borderRadius: '50%', padding: '2px' }}>
                <Check size={12} color={recommended ? '#fff' : '#9ca3af'} />
              </div>
            ) : (
              <X size={16} />
            )}
            <span style={{ textDecoration: feature.included ? 'none' : 'line-through' }}>{feature.text}</span>
          </div>
        ))}
      </div>

      <button
        onClick={buttonAction}
        disabled={current}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '8px',
          border: 'none',
          background: current ? 'rgba(255,255,255,0.1)' : (recommended ? themeColor : '#fff'),
          color: current ? '#9ca3af' : (recommended ? '#fff' : '#000'),
          fontWeight: 'bold',
          cursor: current ? 'default' : 'pointer',
          transition: 'all 0.2s',
          opacity: current ? 0.7 : 1
        }}
      >
        {current ? 'Plano Atual' : buttonText}
      </button>
    </div>
  );
};

const Plans = ({ themeColor = '#006fee' }) => {
  const plans = [
    {
      title: 'Free',
      price: 'Grátis',
      current: true,
      features: [
        { text: '1 Milhão de visualizações/mês', included: true },
        { text: '3 Sites monitorados', included: true },
        { text: 'Histórico de 30 dias', included: true },
        { text: 'Suporte da Comunidade', included: true },
        { text: 'Remover Branding', included: false },
        { text: 'API de Acesso', included: false },
      ],
      buttonText: 'Seu Plano'
    },
    {
      title: 'Pro',
      price: 'R$ 49',
      recommended: true,
      features: [
        { text: '5 Milhões de visualizações/mês', included: true },
        { text: '10 Sites monitorados', included: true },
        { text: 'Histórico de 1 ano', included: true },
        { text: 'Suporte Prioritário', included: true },
        { text: 'Remover Branding', included: true },
        { text: 'API de Acesso', included: true },
      ],
      buttonText: 'Fazer Upgrade'
    },
    {
      title: 'Enterprise',
      price: 'Sob Consulta',
      features: [
        { text: 'Visualizações Ilimitadas', included: true },
        { text: 'Sites Ilimitados', included: true },
        { text: 'Histórico Ilimitado', included: true },
        { text: 'Gerente de Conta Dedicado', included: true },
        { text: 'SLA Garantido', included: true },
        { text: 'Infraestrutura Dedicada', included: true },
      ],
      buttonText: 'Falar com Vendas'
    }
  ];

  return (
    <div style={{ padding: '2rem', height: '100%', overflowY: 'auto' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fff' }}>Escolha o plano ideal para você</h1>
          <p style={{ color: '#9ca3af', fontSize: '1.1rem' }}>Escale sua monitoria de dados com nossos planos flexíveis.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', justifyContent: 'center' }}>
          {plans.map((plan, index) => (
            <PlanCard 
              key={index} 
              {...plan} 
              themeColor={themeColor}
              buttonAction={() => alert('Integração de pagamento em breve!')}
            />
          ))}
        </div>

        <div style={{ marginTop: '4rem', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={20} color={themeColor} />
            Perguntas Frequentes
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h4 style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '0.5rem' }}>Posso cancelar a qualquer momento?</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5' }}>Sim, você pode cancelar sua assinatura a qualquer momento. O acesso continuará ativo até o final do período pago.</p>
            </div>
            <div>
              <h4 style={{ fontWeight: 'bold', color: '#e5e7eb', marginBottom: '0.5rem' }}>O que acontece se eu exceder o limite?</h4>
              <p style={{ color: '#9ca3af', fontSize: '0.9rem', lineHeight: '1.5' }}>Nós avisaremos você quando estiver próximo do limite. Se exceder, seus dados continuarão sendo coletados por um período de carência.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
