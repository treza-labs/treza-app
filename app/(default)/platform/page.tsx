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
          {/* Page header */}
          <div className="pb-12 text-center">
            <h1 className="animate-[gradient_6s_linear_infinite] bg-[linear-gradient(to_right,var(--color-gray-200),var(--color-indigo-200),var(--color-gray-50),var(--color-indigo-300),var(--color-gray-200))] bg-[length:200%_auto] bg-clip-text font-nacelle text-3xl font-semibold text-transparent md:text-4xl">
              Treza Platform
            </h1>
            <p className="text-lg text-gray-400 mt-4">
              Connect your wallet, manage secure enclaves, and deploy AI agents
            </p>
          </div>

          <PlatformDashboard />
        </div>
      </div>
    </section>
  );
} 