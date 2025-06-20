export const metadata = {
  title: "Platform - Treza",
  description: "Manage your secure enclaves, tasks, and API keys",
};

import PlatformDashboard from "./platform-dashboard";

export default function Platform() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="py-12 md:py-20">
          <PlatformDashboard />
        </div>
      </div>
    </section>
  );
} 