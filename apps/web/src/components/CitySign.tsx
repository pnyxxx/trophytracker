import React from 'react';

interface CitySignProps {
  cityName: string;
  className?: string;
}

const CitySign: React.FC<CitySignProps> = ({ cityName, className = "" }) => {
  return (
    <div className={`inline-block ${className}`}>
      {/* Cadre extérieur gris */}
      <div 
        className="relative rounded-lg"
        style={{
          background: '#d1d5db',
          padding: '6px',
          borderRadius: '12px',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.5)'
        }}
      >
        {/* Panneau principal avec bordure rouge */}
        <div 
          className="relative bg-white rounded-md"
          style={{
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontWeight: 'bold',
            padding: '8px 16px',
            letterSpacing: '1px',
            border: '4px solid #dc2626',
            borderRadius: '6px',
            textAlign: 'center',
            minWidth: '100px'
          }}
        >
          {/* Texte du nom de ville */}
          <span 
            className="text-black uppercase tracking-wider"
            style={{
              fontVariant: 'small-caps',
              display: 'block',
              lineHeight: '1.2'
            }}
          >
            {cityName}
          </span>
        </div>
      </div>
      
      {/* Support du panneau */}
      <div 
        className="mx-auto mt-1 w-1 h-8 bg-gray-400"
        style={{
          borderRadius: '2px',
          boxShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
        }}
      />
    </div>
  );
};

export default CitySign;
