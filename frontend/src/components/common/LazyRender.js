import React, { useRef, useState, useEffect } from 'react';

const LazyRender = React.memo(({ children, height = 300, rootMargin = '100px' }) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect(); // Only need to observe once
                }
            },
            { rootMargin, threshold: 0.01 }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [rootMargin]);

    return (
        <div ref={ref} style={{ minHeight: isVisible ? 'auto' : height }}>
            {isVisible ? children : (
                <div style={{
                    height, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#94a3b8', fontSize: '0.9rem'
                }}>
                    Đang tải biểu đồ...
                </div>
            )}
        </div>
    );
});

export default LazyRender;
