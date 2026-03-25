const DesktopHome = () => {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 bg-primary text-white p-4">Sidebar</aside>

      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold text-primary">Clinic Dashboard</h1>
      </main>
    </div>
  );
};
export default DesktopHome;
