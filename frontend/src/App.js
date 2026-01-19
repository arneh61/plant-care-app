import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, PrivateRoute, PublicRoute } from './components/Auth';
import AuthPage from './components/AuthPage';
import CollectionsList from './components/CollectionsList';
import CollectionView from './components/CollectionView';
import PlantDetails from './components/PlantDetails';
import PlantDoctor from './components/PlantDoctor';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<PublicRoute><AuthPage /></PublicRoute>} />
          <Route path="/collections" element={<PrivateRoute><CollectionsList /></PrivateRoute>} />
          <Route path="/collections/:collectionId" element={<PrivateRoute><CollectionView /></PrivateRoute>} />
          <Route path="/collections/:collectionId/doctor" element={<PrivateRoute><PlantDoctor /></PrivateRoute>} />
          <Route path="/plants/:plantId" element={<PrivateRoute><PlantDetails /></PrivateRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;