import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import InviteCodePage from './pages/InviteCodePage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/invite" element={<InviteCodePage />} />
      </Routes>
    </Router>
  );
}

export default App;
