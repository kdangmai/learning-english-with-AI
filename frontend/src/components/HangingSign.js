import React from 'react';
import './HangingSign.css';

const HangingSign = ({ children, className = '' }) => {
  return (
    <div className="signboard-wrapper">
      <div className={`signboard ${className}`}>
        {children}
      </div>
      <div className="signboard-string"></div>
      <div className="pin pin1"></div>
      <div className="pin pin2"></div>
      <div className="pin pin3"></div>
    </div>
  );
};

export default HangingSign;
