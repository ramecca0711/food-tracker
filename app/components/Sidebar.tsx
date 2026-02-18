'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface SidebarProps {
  userEmail: string | null;
  onSignOut: () => void;
}

export default function Sidebar({ userEmail, onSignOut }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['wellbeing']));
  const router = useRouter();
  const pathname = usePathname();

  // Toggle sidebar open/closed
  const toggleSidebar = () => setIsOpen(!isOpen);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Navigate to page
  const navigateTo = (path: string) => {
    router.push(path);
    if (window.innerWidth < 1024) {
      setIsOpen(false); // Close sidebar on mobile after navigation
    }
  };

  // Check if current path matches
  const isActive = (path: string) => pathname === path;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Hamburger button - Always visible */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50"
      >
        <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
          isOpen ? 'w-64' : 'w-0'
        } overflow-hidden`}
      >
        <div className="h-full flex flex-col">
          {/* Logo/Brand */}
          <div className="p-4 border-b border-gray-200">
            <h1 className="font-bold text-xl text-gray-900">TheraPie</h1>
            <p className="text-xs text-gray-500">Life's a piece of pie</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3">
            
            {/* ========== HOME SECTION ========== */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('home')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  expandedSections.has('home') ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">Home</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has('home') ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedSections.has('home') && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => navigateTo('/')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => navigateTo('/about')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/about') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    About
                  </button>
                </div>
              )}
            </div>

            {/* ========== WELLBEING SECTION ========== */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('wellbeing')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  expandedSections.has('wellbeing') ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">WellBeing</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has('wellbeing') ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedSections.has('wellbeing') && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => navigateTo('/wellbeing/dashboard')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/wellbeing/dashboard') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Dashboard
                  </button>
                  
                  {/* Fuel subsection */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-gray-500 px-3 pb-1">Fuel</div>
                    <button
                      onClick={() => navigateTo('/wellbeing/fuel/food-log')}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        isActive('/wellbeing/fuel/food-log') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Food Log
                    </button>
                    <button
                      onClick={() => navigateTo('/wellbeing/fuel/grocery-list')}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        isActive('/wellbeing/fuel/grocery-list') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Grocery List
                    </button>
                  </div>
                  
                  {/* Body subsection */}
                  <div className="pt-2">
                    <div className="text-xs font-semibold text-gray-500 px-3 pb-1">Body</div>
                    <button
                      onClick={() => navigateTo('/wellbeing/body/dashboard')}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        isActive('/wellbeing/body/dashboard') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Dashboard
                    </button>
                    <button
                      onClick={() => navigateTo('/wellbeing/body/training-plan')}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        isActive('/wellbeing/body/training-plan') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Training Plan
                    </button>
                    <button
                      onClick={() => navigateTo('/wellbeing/body/progress-photos')}
                      className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                        isActive('/wellbeing/body/progress-photos') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      Progress Photos
                    </button>
                  </div>
                  
                  {/* Goals */}
                  <button
                    onClick={() => navigateTo('/wellbeing/goals')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm mt-2 ${
                      isActive('/wellbeing/goals') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Goals
                  </button>
                </div>
              )}
            </div>

            {/* ========== GROWTH SECTION ========== */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('growth')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  expandedSections.has('growth') ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">Growth</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has('growth') ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedSections.has('growth') && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => navigateTo('/growth/values')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/values') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Values
                  </button>
                  <button
                    onClick={() => navigateTo('/growth/affirmations')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/affirmations') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Affirmations
                  </button>
                  <button
                    onClick={() => navigateTo('/growth/journal')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/journal') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Journal / Activity Log
                  </button>
                  <button
                    onClick={() => navigateTo('/growth/todo')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/todo') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    To Do List
                  </button>
                  <button
                    onClick={() => navigateTo('/growth/bingo')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/bingo') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Bingo Card
                  </button>
                  <button
                    onClick={() => navigateTo('/growth/vision-board')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/growth/vision-board') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Vision Board
                  </button>
                </div>
              )}
            </div>

            {/* ========== CONNECTION SECTION ========== */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('connection')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  expandedSections.has('connection') ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">Connection</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has('connection') ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedSections.has('connection') && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => navigateTo('/connection/my-circle')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/connection/my-circle') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    My Circle
                  </button>
                  <button
                    onClick={() => navigateTo('/connection/food-sharing')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/connection/food-sharing') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Food Sharing
                  </button>
                </div>
              )}
            </div>

            {/* ========== REPORTS & RESOURCES SECTION ========== */}
            <div className="mb-3">
              <button
                onClick={() => toggleSection('reports')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 ${
                  expandedSections.has('reports') ? 'bg-gray-50' : ''
                }`}
              >
                <span className="text-sm font-semibold text-gray-900">Reports & Resources</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedSections.has('reports') ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedSections.has('reports') && (
                <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
                  <button
                    onClick={() => navigateTo('/reports/year-wrapped')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/reports/year-wrapped') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Year Wrapped
                  </button>
                  <button
                    onClick={() => navigateTo('/reports/monthly')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/reports/monthly') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Monthly Reports
                  </button>
                  <button
                    onClick={() => navigateTo('/reports/story-templates')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/reports/story-templates') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Instagram Story Templates
                  </button>
                  <button
                    onClick={() => navigateTo('/resources/research')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/resources/research') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Research Articles
                  </button>
                  <button
                    onClick={() => navigateTo('/resources/integrations')}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                      isActive('/resources/integrations') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    App Integrations
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* User info at bottom */}
          {userEmail && (
            <div className="p-4 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-2 truncate">{userEmail}</div>
              <button
                onClick={onSignOut}
                className="text-sm text-red-600 hover:text-red-700 font-medium"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}