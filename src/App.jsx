import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import CreatorPanel from './components/CreatorPanel';
import ArViewer from './components/ArViewer';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CreatorPanel />} />
        <Route path="/viewer" element={<ArViewer />} />
      </Routes>
    </Router>
  );
}

export default App;