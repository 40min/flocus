import React from 'react';
import CurrentTasks from '../components/CurrentTasks';
import PomodoroTimer from '../components/PomodoroTimer';

const DashboardPage: React.FC = () => {
  return (
    <div>
      <header className="w-full px-6 py-8 md:px-12 md:py-12">
        <div className="flex items-center justify-center md:justify-start">
          <h1 className="text-2xl md:text-3xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <span>Focus</span>
          </h1>
        </div>
      </header>
      <main className="flex-1 px-6 md:px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
            <section className="lg:col-span-7 xl:col-span-8 flex justify-center">
              <div className="w-full max-w-lg">
                <PomodoroTimer />
              </div>
            </section>
            <aside className="lg:col-span-5 xl:col-span-4">
              <div className="sticky top-8">
                <CurrentTasks />
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
