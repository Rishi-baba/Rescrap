import React, { useState } from 'react';
import { collectorSession } from './lib/session.js';
import { offlineDb } from './lib/offline-db.js';
import { Header } from './components/Header.js';
import { BottomNav, type CollectorTab } from './components/BottomNav.js';
import { SplashView } from './screens/SplashView.js';
import { LoginView } from './screens/LoginView.js';
import { LanguageModal } from './screens/LanguageModal.js';
import { HomeView } from './screens/HomeView.js';
import { AddScrapFlow } from './screens/AddScrapFlow.js';
import { RecyclerMatchesView } from './screens/RecyclerMatchesView.js';
import { HandoverView } from './screens/HandoverView.js';
import { MyScrapView } from './screens/MyScrapView.js';
import { PriceBoardView } from './screens/PriceBoardView.js';
import { EarningsView } from './screens/EarningsView.js';
import { ProfileView } from './screens/ProfileView.js';

export const App: React.FC = () => {
  const [isSplashDone, setIsSplashDone] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => collectorSession.getCollectorId() !== null);
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(offlineDb.isOnline());

  // Navigation state
  const [activeTab, setActiveTab] = useState<CollectorTab>('home');
  const [activeFlow, setActiveFlow] = useState<'add-scrap' | 'matches' | 'handover' | null>(null);
  const [selectedLotId, setSelectedLotId] = useState<string>('lot_demo_01');

  // Splash screen on initial load
  if (!isSplashDone) {
    return <SplashView onDone={() => setIsSplashDone(true)} />;
  }

  // Authentication gate
  if (!isAuthenticated) {
    return (
      <LoginView
        onSuccess={() => {
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Handover flow
  if (activeFlow === 'handover') {
    return (
      <div className="min-h-screen bg-stone-50 max-w-md mx-auto flex flex-col">
        <HandoverView
          lotId={selectedLotId}
          onBack={() => setActiveFlow(null)}
          onDone={() => {
            setActiveFlow(null);
            setActiveTab('home');
          }}
        />
      </div>
    );
  }

  // Competing Recycler Offers / Matches flow
  if (activeFlow === 'matches') {
    return (
      <div className="min-h-screen bg-stone-50 max-w-md mx-auto flex flex-col">
        <RecyclerMatchesView
          lotId={selectedLotId}
          onBack={() => setActiveFlow(null)}
          onProceedToHandover={() => setActiveFlow('handover')}
        />
      </div>
    );
  }

  // Add Scrap Camera & AI Stepper flow
  if (activeFlow === 'add-scrap') {
    return (
      <div className="min-h-screen bg-stone-50 max-w-md mx-auto flex flex-col">
        <AddScrapFlow
          onCancel={() => setActiveFlow(null)}
          onComplete={(newLotId) => {
            setSelectedLotId(newLotId);
            setActiveFlow('matches');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center">
      {/* Mobile constraint frame */}
      <div className="w-full max-w-md min-h-screen bg-stone-50 shadow-2xl flex flex-col relative border-x border-stone-200">
        {/* Sticky Mobile Header */}
        <Header
          onOpenLanguage={() => setIsLanguageModalOpen(true)}
          isOnline={isOnline}
          onToggleOnline={(next) => setIsOnline(next)}
        />

        {/* Tab Content */}
        <main className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'home' && (
            <HomeView
              onStartAddScrap={() => setActiveFlow('add-scrap')}
              onOpenLot={(id) => {
                setSelectedLotId(id);
                setActiveFlow('matches');
              }}
              onOpenPrices={() => setActiveTab('prices')}
              onOpenEarnings={() => setActiveTab('earnings')}
            />
          )}

          {activeTab === 'my-scrap' && (
            <MyScrapView
              onStartAddScrap={() => setActiveFlow('add-scrap')}
              onOpenLot={(id) => {
                setSelectedLotId(id);
                setActiveFlow('matches');
              }}
            />
          )}

          {activeTab === 'prices' && (
            <PriceBoardView
              onStartSell={(_materialId) => {
                setActiveFlow('add-scrap');
              }}
            />
          )}

          {activeTab === 'earnings' && (
            <EarningsView
              onOpenLotPassport={(id) => {
                setSelectedLotId(id);
                setActiveFlow('handover');
              }}
            />
          )}

          {activeTab === 'profile' && (
            <ProfileView
              onOpenLanguage={() => setIsLanguageModalOpen(true)}
              onLogout={() => {
                setIsAuthenticated(false);
              }}
            />
          )}
        </main>

        {/* 5-Tab Fixed Bottom Navigation */}
        <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

        {/* Language Modal */}
        <LanguageModal
          isOpen={isLanguageModalOpen}
          onClose={() => setIsLanguageModalOpen(false)}
        />
      </div>
    </div>
  );
};
