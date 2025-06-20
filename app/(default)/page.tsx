export const metadata = {
  title: "Treza - AI Agents for Crypto Execution",
  description: "Deploy AI-powered agents that monitor markets, analyze data, and execute strategies on-chain. Built for crypto-native teams and automated trading flows.",
};

import PlatformDashboard from "./platform/platform-dashboard";

export default function Home() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          {/* Page header */}
          <div className="pb-12 text-center">
          <PlatformDashboard />
        </div>
      </div>
      </div>
    </section>
  );
}
