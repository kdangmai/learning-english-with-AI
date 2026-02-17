import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import PageLoader from './PageLoader';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 10,
        scale: 0.99,
        filter: 'blur(4px)'
    },
    in: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: 'blur(0px)'
    },
    out: {
        opacity: 0,
        y: -10,
        scale: 1.01,
        filter: 'blur(2px)'
    }
};

const pageTransition = {
    type: 'tween',
    ease: [0.25, 0.1, 0.25, 1],
    duration: 0.3
};

const AnimatedPage = ({ children }) => {
    return (
        <motion.div
            initial="initial"
            animate="in"
            exit="out"
            variants={pageVariants}
            transition={pageTransition}
            style={{
                width: '100%',
                height: '100%',
                position: 'absolute',
                top: 0,
                left: 0,
                overflowY: 'auto',
                overflowX: 'hidden'
            }}
        >
            <Suspense fallback={<PageLoader />}>
                {children}
            </Suspense>
        </motion.div>
    );
};

export default AnimatedPage;
