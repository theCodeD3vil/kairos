import { LenisProvider } from '@/lib/landing/lenis';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Problem } from '@/components/landing/Problem';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { FeatureGrid } from '@/components/landing/FeatureGrid';
import { DemoMarquee } from '@/components/landing/DemoMarquee';
import { Privacy } from '@/components/landing/Privacy';
import { Stats } from '@/components/landing/Stats';
import { DownloadCTA } from '@/components/landing/DownloadCTA';
import { Footer } from '@/components/landing/Footer';
import { ScrollProgress } from '@/components/landing/ScrollProgress';
import { CustomCursor } from '@/components/landing/CustomCursor';

export default function App() {
  return (
    <LenisProvider>
      <ScrollProgress />
      <CustomCursor />
      <div className="relative">
        <Nav />
        <Hero />
        <Problem />
        <HowItWorks />
        <FeatureGrid />
        <DemoMarquee />
        <Privacy />
        <Stats />
        <DownloadCTA />
        <Footer />
      </div>
    </LenisProvider>
  );
}
