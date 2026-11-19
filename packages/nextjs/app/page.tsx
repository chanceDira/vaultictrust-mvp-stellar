import type { NextPage } from "next";
import { AssetClasses } from "~~/components/home/AssetClasses";
import { AudiencePaths } from "~~/components/home/AudiencePaths";
import { ClosingCallToAction } from "~~/components/home/ClosingCallToAction";
import { FeaturedAssetsShowcase } from "~~/components/home/FeaturedAssetsShowcase";
import { HomeFaq } from "~~/components/home/HomeFaq";
import { HomeHero } from "~~/components/home/HomeHero";
import { JourneyTimeline } from "~~/components/home/JourneyTimeline";
import { LiveTotalsStrip } from "~~/components/home/LiveTotalsStrip";
import { MissionSection } from "~~/components/home/MissionSection";
import { ProofPoints } from "~~/components/home/ProofPoints";
import { RoadmapSection } from "~~/components/home/RoadmapSection";
import { WhyStellarBand } from "~~/components/home/WhyStellarBand";

const Home: NextPage = () => {
  return (
    <div className="flex min-h-0 flex-col">
      <HomeHero />
      <LiveTotalsStrip />
      <FeaturedAssetsShowcase />
      <AudiencePaths />
      <JourneyTimeline />
      <AssetClasses />
      <MissionSection />
      <ProofPoints />
      <WhyStellarBand />
      <RoadmapSection />
      <HomeFaq />
      <ClosingCallToAction />
    </div>
  );
};

export default Home;
