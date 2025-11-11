export const metadata = {
  title: "Treza Network - Privacy infrastructure for crypto and finance",
  description: "Deploy your applications in hardware-protected enclaves with cryptographic privacy guarantees. Run containers, APIs and AI workloads with simple, privacy-focused developer tools.",
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