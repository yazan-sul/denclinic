const MobileHome = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="bg-primary text-white p-4 text-center font-semibold shadow-sm">
        Clinic App
      </header>

      <main className="flex-1 p-4">
        <h1 className="text-lg font-bold text-primary">Mobile Home</h1>
      </main>

      <nav className="border-t border-border bg-card p-3 flex justify-around text-sm">
        <span className="text-primary font-medium">Home</span>
        <span className="text-muted-foreground">Patients</span>
        <span className="text-muted-foreground">Debts</span>
        <span className="text-muted-foreground">Settings</span>
      </nav>
    </div>
  );
};

export default MobileHome;
