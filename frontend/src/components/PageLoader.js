import React from 'react';
import './PageLoader.css';

const PageLoader = () => {
    return (
        <div className="page-loader-wrapper">
            <div className="page-loader-spinner"></div>
            <span className="page-loader-text">Đang tải trải nghiệm...</span>
        </div>
    );
};

export default PageLoader;
