// Force dynamic rendering — PageLayout imports lib/supabase which reads env vars
// that are not available at build time during static prerendering.
export const dynamic = 'force-dynamic';

import PageLayout from '../components/PageLayout';

const Tag = ({ children }: { children: React.ReactNode }) => (
  <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700">
    {children}
  </span>
);

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">About Home Base</h1>
          <p className="mt-3 text-lg text-gray-600">
            Build a home within yourself.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Tag>Rooted</Tag>
            <Tag>Rising</Tag>
            <Tag>Simple logs → real insight</Tag>
            <Tag>Less tracking, more understanding</Tag>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-6">
              I’m Ryan. My values are <strong>Growth</strong>, <strong>Connection</strong>, and{' '}
              <strong>Wellbeing</strong>.
            </p>

            <p className="text-gray-700 mb-4">
              I started therapy in 2018, and it changed my life. Over time, I learned that the
              basics matter: structure, intentionality, and celebrating small wins. I also learned
              that most tracking apps either ask too much or give too little back.
            </p>

            <p className="text-gray-700 mb-4">
              Home Base is the system I use to keep my life coherent — food, movement, mood, goals,
              and relationships — all in one place. It’s for people who want clarity without
              complexity, and reflection without shame.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why Home Base?</h2>
            <p className="text-gray-700 mb-4">
              Life is not one thing. You don’t have to “optimize everything.” You just need a
              simple way to notice what’s working, what’s missing, and what you want more of.
            </p>

            <p className="text-gray-700 mb-4">
              In Home Base, each area represents a domain you can click into (Wellbeing, Growth,
              Connection, and Life Systems). It’s meant to feel both calm <em>and</em> real.
            </p>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Driven by Research & Math</h2>
            <p className="text-gray-700 mb-4">
              Home Base isn’t just feel-good philosophy. It’s built on evidence-backed ideas and
              practical measurement — using simple inputs to generate useful insight.
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Nutrition goals grounded in reputable guidelines and research</li>
              <li>Biodiversity signals inspired by gut microbiome studies</li>
              <li>Goal-setting frameworks from behavioral psychology</li>
              <li>Reflection prompts influenced by therapeutic approaches (like CBT)</li>
            </ul>

            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">The Three Pillars</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="p-6 bg-emerald-50 rounded-xl border border-emerald-200">
                <h3 className="text-lg font-bold text-emerald-900 mb-2">💚 Wellbeing</h3>
                <p className="text-sm text-emerald-800">
                  Your foundation: fuel, body, movement, rest. Clear tracking, kinder adjustments,
                  and a calmer relationship with your health.
                </p>
              </div>

              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-2">🌱 Growth</h3>
                <p className="text-sm text-blue-800">
                  Your inner world: values, habits, reflection, and direction. Becoming who you
                  want to be — one small decision at a time.
                </p>
              </div>

              <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-2">🤝 Connection</h3>
                <p className="text-sm text-purple-800">
                  Your people: community, support, sharing. Because progress is easier (and more
                  meaningful) together.
                </p>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">Built in Public</h2>
            <p className="text-gray-700 mt-2">
              This is a work in progress — just like all of us. I’m building Home Base with real use
              in mind: shipping, learning, iterating, and keeping what’s genuinely helpful.
            </p>

            <div className="mt-8 rounded-xl border border-gray-200 bg-gray-50 p-6">
              <p className="text-gray-800 m-0">
                Thank you for being here. Let’s keep building, one day at a time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
