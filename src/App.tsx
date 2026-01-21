import { Layout } from './components/Layout';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { TechStack } from './components/TechStack';
import { Gallery } from './components/Gallery';
import { Spotlight, CardSpotlightEffect } from './components/Spotlight';
import { NetworkBackground } from './components/NetworkBackground';

function App() {
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

export default App;
