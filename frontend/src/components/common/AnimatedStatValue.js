import React, { useState, useEffect } from 'react';

function useAnimatedValue(target, duration = 800) {
    const [value, setValue] = useState(0);
    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        let startTime;
        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease out cubic
            setValue(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [target, duration]);
    return value;
}

const AnimatedStatValue = ({ value }) => {
    const animated = useAnimatedValue(value);
    return <>{animated}</>;
};

export default AnimatedStatValue;
