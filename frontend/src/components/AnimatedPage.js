import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import PageLoader from './PageLoader';

const pageVariants = {
    initial: {
        opacity: 0,
        y: 12,
        scale: 0.98,
    },
    in: {
        opacity: 1,
        y: 0,
        scale: 1,
    },
    out: {
        opacity: 0,
        y: -8,
        scale: 1.01,
    }
};

const pageTransition = {
    type: 'tween',
    ease: [0.22, 0.68, 0.35, 1],
    duration: 0.35
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
