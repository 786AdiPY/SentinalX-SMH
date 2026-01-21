import { Layout } from './Layout';
import { Hero } from './Hero';
import { Features } from './Features';
import { TechStack } from './TechStack';
import { Gallery } from './Gallery';
import { Spotlight, CardSpotlightEffect } from './Spotlight';
import { NetworkBackground } from './NetworkBackground';

export function Portfolio() {
    return (
        <Layout>
            <NetworkBackground />
            <Spotlight />
            <CardSpotlightEffect />
            <Hero />
            <Features />
            <Gallery />
            <TechStack />
        </Layout>
    );
}
