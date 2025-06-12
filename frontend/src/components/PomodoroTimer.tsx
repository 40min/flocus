import React from 'react';
import { Play, RotateCcw, SkipForward } from 'lucide-react';

const PomodoroTimer: React.FC = () => {
  return (
    <section className="w-full max-w-lg mx-auto" role="main" aria-label="Pomodoro Timer">
      <div className="transition-all duration-300">
        <div className="text-card-foreground flex flex-col gap-6 rounded-xl border py-6 relative overflow-hidden bg-gray-900/50 backdrop-blur-sm border-gray-700/50 shadow-2xl">
          <div className="p-8 md:p-12 flex flex-col items-center space-y-8">
            <div className="relative w-full flex justify-center">
              <figure className="relative flex flex-col items-center" role="timer" aria-label="Pomodoro Timer">
                <div className="relative">
                  <div
                    className="relative w-72 h-72 md:w-80 md:h-80 rounded-full bg-gray-800 border-2 border-gray-700 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center focus-within:ring-4 focus-within:ring-primary/20"
                    tabIndex={0}
                    role="button"
                    aria-label="Timer drop zone - drag tasks here to focus"
                  >
                    <div className="text-center">
                      <div className="text-5xl md:text-6xl font-bold font-mono text-white">
                        25:00
                      </div>
                      <p className="text-sm text-gray-400 mt-2 max-w-32">
                        Drop a task here to start focusing
                      </p>
                    </div>
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-700/80 hover:bg-gray-700 border border-gray-600/50 hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-white"
                        aria-label="Reset timer"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium disabled:pointer-events-none disabled:opacity-50 size-9 h-8 w-8 rounded-full bg-gray-700/80 hover:bg-gray-700 border border-gray-600/50 hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-200 text-white"
                        aria-label="Skip break"
                      >
                        <SkipForward className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </figure>
            </div>
            <div className="w-full max-w-xs" tabIndex={0}>
              <button
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-6 w-full h-14 text-lg font-semibold rounded-full text-gray-900 shadow-lg hover:shadow-xl transition-all duration-300 focus:ring-4 focus:ring-primary/20 focus:outline-none bg-white hover:bg-gray-200"
                aria-label="Start/Pause timer"
              >
                <div className="flex items-center gap-2">
                  <Play className="h-5 w-5" />
                  <span>Start</span>
                </div>
              </button>
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm md:text-base font-medium">
                Today: 2 Pomos · 1h 30m
              </p>
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none"></div>
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
        </div>
      </div>
    </section>
  );
};

export default PomodoroTimer;
