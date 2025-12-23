import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Home from './pages/Home';
import PipelineBuilder from './pages/PipelineBuilder';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-slate-950 text-slate-100">
          <Navbar />
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-h-screen pt-24 pb-10 px-4 sm:px-6 lg:px-10 md:ml-64">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/pipeline" element={<PipelineBuilder />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
