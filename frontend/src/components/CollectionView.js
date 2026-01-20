import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api } from './Auth';

export default function CollectionView() {
  const [collectionName, setCollectionName] = useState('');
  const { collectionId } = useParams();
  const [plants, setPlants] = useState([]);
  const [showAddPlant, setShowAddPlant] = useState(false);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualScientific, setManualScientific] = useState('');
  const [manualImage, setManualImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPlants();
  }, [collectionId]);

  const loadPlants = async () => {
    try {
      const response = await api.get(`/collections/${collectionId}/plants`);
      setPlants(response.data);
    } catch (error) {
      console.error('Failed to load plants:', error);
    }
  };

  const renameCollection = async () => {
  if (!collectionName) return alert('Name required');
  try {
    await api.put(`/collections/${collectionId}`, { name: collectionName });
    setCollectionName('');
    alert('Collection renamed!');
  } catch (error) {
    alert('Failed to rename collection');
  }
};

  const searchPlants = async () => {
    if (!searchQuery) return;
    setSearching(true);
    setSearchError('');
    try {
      const response = await api.get('/plants/search', { params: { q: searchQuery } });
      setSearchResults(response.data.data || []);
    } catch (error) {
      setSearchError(error.response?.data?.error || 'Search failed');
    }
    setSearching(false);
  };

  const addPlant = async (plantData) => {
  try {
      const detailsResponse = await api.get(`/plants/details/${plantData.id}`);
      const details = detailsResponse.data;
      
      let imageUrl = details.default_image?.regular_url || plantData.default_image?.regular_url || plantData.default_image?.thumbnail;
      
      // Create user-friendly source URL (public page, not API)
      let sourceUrl = null;
      if (plantData.source === 'trefle') {
      const plantSlug = plantData.id.replace('trefle_', '');
      sourceUrl = `https://trefle.io/explore/species/${plantSlug}`;
      }
      
      await api.post(`/collections/${collectionId}/plants`, {
      name: plantData.common_name || plantData.scientific_name,
      common_name: plantData.common_name,
      scientific_name: plantData.scientific_name,
      external_id: plantData.id,
      care_data: {
          watering: details.watering || 'Average',
          sunlight: details.sunlight || ['Full sun to partial shade'],
          humidity: details.humidity || 'Average'
      },
      image_url: imageUrl,
      source_url: sourceUrl
      });
      
      setShowAddPlant(false);
      setSearchQuery('');
      setSearchResults([]);
      loadPlants();
  } catch (error) {
      setSearchError('Failed to add plant');
  }
  };

  const addManualPlant = async () => {
    if (!manualName) return alert('Plant name required');
    try {
      const formData = new FormData();
      formData.append('name', manualName);
      formData.append('scientific_name', manualScientific);
      if (manualImage) {
        formData.append('image', manualImage);
      }

      await api.post(`/collections/${collectionId}/plants/manual`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setShowManualAdd(false);
      setManualName('');
      setManualScientific('');
      setManualImage(null);
      loadPlants();
    } catch (error) {
      alert('Failed to add plant');
    }
  };

  const sendInvite = async () => {
    if (!inviteEmail) return alert('Email required');
    try {
      const response = await api.post(`/collections/${collectionId}/invite`, { email: inviteEmail });
      setInviteLink(response.data.inviteUrl);
      setInviteEmail('');
    } catch (error) {
      alert('Failed to send invite');
    }
  };

  const waterPlant = async (plantId) => {
    try {
      await api.post(`/plants/${plantId}/water`, {});
      loadPlants();
    } catch (error) {
      console.error('Failed to log watering');
    }
  };

  const needsWater = (lastWatered, wateringFrequency) => {
    if (!lastWatered) return true;
    const daysSince = (Date.now() - new Date(lastWatered)) / (1000 * 60 * 60 * 24);
    const frequencyMap = { 'Frequent': 3, 'Average': 7, 'Minimum': 14 };
    return daysSince > (frequencyMap[wateringFrequency] || 7);
  };

  const needsFertilizer = (lastFertilized) => {
    if (!lastFertilized) return true;
    return (Date.now() - new Date(lastFertilized)) / (1000 * 60 * 60 * 24) > 30;
  };

  const plantsByLocation = plants.reduce((acc, plant) => {
  const location = plant.location || 'Unassigned';
  if (!acc[location]) acc[location] = [];
    acc[location].push(plant);
    return acc;
  }, {});

  return (
    <div className="page">
      <header>
        <button onClick={() => navigate('/collections')} className="back-btn">← Back</button>
        <h1>🪴 My Plants</h1>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => navigate(`/collections/${collectionId}/doctor`)} className="doctor-btn">🩺 Plant Doctor</button>
          <button onClick={() => setShowSettings(true)} className="add-btn">⚙️ Settings</button>
          <button onClick={() => setShowAddPlant(true)} className="add-btn">+ Search</button>
          <button onClick={() => setShowManualAdd(true)} className="add-btn">✏️ Manual Add</button>
        </div>
      </header>

      {/* Modals */}
      {showAddPlant && (
        <div className="modal">
          <div className="modal-content">
            <h2>Search Plant</h2>
            <div className="search-box">
              <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && searchPlants()} />
              <button onClick={searchPlants} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
            </div>
            {searchError && <div className="error">{searchError}</div>}
            <div className="search-results">
              {searchResults.map(plant => (
                <div key={plant.id} className="search-result-item" onClick={() => addPlant(plant)}>
                  {plant.default_image?.thumbnail && <img src={plant.default_image.thumbnail} alt={plant.common_name} onError={(e) => e.target.style.display = 'none'} />}
                  <div>
                    <strong>{plant.common_name}</strong>
                    <div className="scientific-name">{plant.scientific_name}</div>
                    {plant.cached && <span className="cache-badge">Cached ✓</span>}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowAddPlant(false)} className="cancel-btn">Cancel</button>
          </div>
        </div>
      )}

      {showManualAdd && (
        <div className="modal">
          <div className="modal-content">
            <h2>Add Manually</h2>
            <input type="text" placeholder="Plant Name *" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <input type="text" placeholder="Scientific Name" value={manualScientific} onChange={(e) => setManualScientific(e.target.value)} />
            <div style={{ margin: '15px 0' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Plant Image (optional):</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setManualImage(e.target.files[0])}
                style={{ width: '100%' }}
              />
            </div>
            <div className="modal-buttons">
              <button onClick={addManualPlant} className="confirm-btn">Add</button>
              <button onClick={() => setShowManualAdd(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="modal">
          <div className="modal-content">
            <h2>Settings
                <h3>Rename Collection</h3>
<input type="text" placeholder="New collection name" value={collectionName} onChange={(e) => setCollectionName(e.target.value)} />
<button onClick={renameCollection} className="confirm-btn">Rename</button>
<hr style={{ margin: '20px 0' }} />
            </h2>
            <h3>Invite Others</h3>
            <input type="email" placeholder="Email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            <button onClick={sendInvite} className="confirm-btn">Send Invite</button>
            {inviteLink && (
              <div style={{ marginTop: '20px', padding: '15px', background: '#e8f5e9', borderRadius: '8px' }}>
                <strong>Link:</strong>
                <input type="text" value={inviteLink} readOnly onClick={(e) => e.target.select()} />
              </div>
            )}
            <button onClick={() => setShowSettings(false)} className="cancel-btn" style={{ marginTop: '20px' }}>Close</button>
          </div>
        </div>
      )}

    {/* Grouped Plant Grid */}
    {Object.keys(plantsByLocation).sort().map(location => (
      <div key={location} style={{ marginBottom: '40px' }}>
        <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '24px' }}>
          📍 {location}
        </h2>
        <div className="plants-grid">
          {plantsByLocation[location].map(plant => {
            const careData = JSON.parse(plant.care_data || '{}');
            const needsWatering = needsWater(plant.last_watered, careData.watering);
            const needsFert = needsFertilizer(plant.last_fertilized);
            
            return (
              <div key={plant.id} className={`plant-card ${needsWatering ? 'needs-water' : ''}`}>
                {plant.image_url && <img src={plant.image_url} alt={plant.name} className="plant-image" onError={(e) => e.target.style.display = 'none'} />}
                <div className="plant-header">
                  <h3>{plant.nickname || plant.name}</h3>
                  {plant.photo_count > 0 && <span className="photo-badge">📸 {plant.photo_count}</span>}
                </div>
                {plant.scientific_name && <div className="scientific-name">{plant.scientific_name}</div>}
                <div className="care-info">
                  <div>💧 {careData.watering_details?.times_per_week || careData.watering || 'Unknown'}</div>
                  <div>☀️ {Array.isArray(careData.sunlight) ? careData.sunlight[0] : (careData.sunlight || 'Unknown')}</div>
                </div>
                <div className="status-row">
                  <div className="watering-status">{plant.last_watered ? `💧 ${formatDistanceToNow(new Date(plant.last_watered))} ago` : '💧 Never'}</div>
                  <div className={`fertilizer-status ${needsFert ? 'needs-fertilizer' : ''}`}>{plant.last_fertilized ? `🌿 ${formatDistanceToNow(new Date(plant.last_fertilized))} ago` : '🌿 Never'}</div>
                </div>
                <div className="button-group">
                  <button onClick={() => waterPlant(plant.id)} className={needsWatering ? 'water-btn urgent' : 'water-btn'}>💧</button>
                  <button onClick={() => navigate(`/plants/${plant.id}`)} className="details-btn">👁️</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    ))}
  </div>
);
}