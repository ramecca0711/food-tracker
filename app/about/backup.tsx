import PageLayout from '../components/PageLayout';

export default function AboutPage() {
  return (
    <PageLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About TheraPie</h1>
        
        <div className="bg-white rounded-2xl border border-gray-200 p-8 mb-8">
          <div className="prose prose-lg max-w-none">
            <p className="text-xl text-gray-700 mb-6">
              I'm Ryan. My values are Growth, Connection, and WellBeing.
            </p>
            
            <p className="text-gray-700 mb-4">
              I started therapy in 2018, and it changed my life. Through that journey, I learned the importance 
              of structure, intentionality, and celebrating small wins. TheraPie is how I structure my life, 
              and I want to share it so we all can celebrate life being a piece of pie.
            </p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Why TheraPie?</h2>
            <p className="text-gray-700 mb-4">
              Life is like a piece of pie. It's meant to be savored, enjoyed in slices, and shared with others. 
              Each slice represents a different aspect of our lives - our wellbeing, our growth, our connections.
            </p>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">Driven by Research & Math</h2>
            <p className="text-gray-700 mb-4">
              TheraPie isn't just feel-good philosophy. It's grounded in evidence-based practices:
            </p>
            <ul className="list-disc list-inside text-gray-700 mb-4 space-y-2">
              <li>Nutritional tracking based on FDA guidelines and peer-reviewed research</li>
              <li>Biodiversity metrics inspired by gut microbiome studies (Zoe research)</li>
              <li>Goal-setting frameworks from behavioral psychology</li>
              <li>Journaling prompts rooted in cognitive behavioral therapy</li>
            </ul>
            
            <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">The Three Pillars</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <div className="p-6 bg-green-50 rounded-xl border border-green-200">
                <h3 className="text-lg font-bold text-green-900 mb-2">💚 WellBeing</h3>
                <p className="text-sm text-green-700">
                  Your physical health - nutrition, movement, rest. The foundation of everything else.
                </p>
              </div>
              
              <div className="p-6 bg-blue-50 rounded-xl border border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-2">🌱 Growth</h3>
                <p className="text-sm text-blue-700">
                  Your personal development - values, habits, reflections. Becoming who you want to be.
                </p>
              </div>
              
              <div className="p-6 bg-purple-50 rounded-xl border border-purple-200">
                <h3 className="text-lg font-bold text-purple-900 mb-2">🤝 Connection</h3>
                <p className="text-sm text-purple-700">
                  Your relationships - community, sharing, support. We're all in this together.
                </p>
              </div>
            </div>
            
            <p className="text-gray-700 mt-8">
              This is a work in progress, just like all of us. I'm building this app in public, 
              iterating based on real use, and adding features as they become meaningful.
            </p>
            
            <p className="text-gray-700 mt-4">
              Thank you for being here. Let's celebrate life, one slice at a time. 🥧
            </p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}