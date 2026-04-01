'use client';

import BottomBar from './BottomBar';

const MobileHome = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background pb-24">
      <header className="bg-primary text-primary-foreground p-4 text-center">Mobile</header>

      <main className="flex-1 p-4">
        <h1 className="text-lg font-bold text-foreground">Mobile Home</h1>
      </main>

      <BottomBar />
    </div>
  );
};

export default MobileHome;
