import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, api } from './Auth';

export default function CollectionsList() {
  const [collections, setCollections] = useState([]);
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    try {
      const response = await api.get('/collections');
      setCollections(response.data);
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  return (
    <div className="page">
      <header>
        <h1>🌿 My Collections</h1>
        <button onClick={logout} className="logout-btn">Logout</button>
      </header>
      
      <div className="collections-grid">
        {collections.map(collection => (
          <div key={collection.id} className="collection-card" onClick={() => navigate(`/collections/${collection.id}`)}>
            <h3>{collection.name}</h3>
            <span className="role-badge">{collection.role}</span>
          </div>
        ))}
      </div>
    </div>
  );
}