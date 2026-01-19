import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { api } from './Auth';

export default function PlantDetails() {
  const { plantId } = useParams();
  const [plant, setPlant] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [wateringHistory, setWateringHistory] = useState([]);
  const [fertilizerHistory, setFertilizerHistory] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [showFertilize, setShowFertilize] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCaption, setUploadCaption] = useState('');
  const [setAsThumb, setSetAsThumb] = useState(false);
  const [fertType, setFertType] = useState('');
  const [fertAmount, setFertAmount] = useState('');
  const [fertNotes, setFertNotes] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editSoil, setEditSoil] = useState('');
  const [editTemperature, setEditTemperature] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWatering, setEditWatering] = useState('');
  const [editSunlight, setEditSunlight] = useState('');
  const [editHumidity, setEditHumidity] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadPlantData();
    loadLocations();
  }, [plantId]);

  const loadPlantData = async () => {
    try {
      const [plantRes, photosRes, waterRes, fertRes] = await Promise.all([
        api.get(`/plants/${plantId}`),
        api.get(`/plants/${plantId}/photos`),
        api.get(`/plants/${plantId}/watering-history`),
        api.get(`/plants/${plantId}/fertilizer-history`)
      ]);
      setPlant(plantRes.data);
      setPhotos(photosRes.data);
      setWateringHistory(waterRes.data);
      setFertilizerHistory(fertRes.data);
    } catch (error) {
      console.error('Failed to load plant data');
    }
  };

  const loadLocations = async () => {
    try {
      if (!plant) {
        const plantRes = await api.get(`/plants/${plantId}`);
        const collectionId = plantRes.data.collection_id;
        const locationsRes = await api.get(`/collections/${collectionId}/locations`);
        setAvailableLocations(locationsRes.data);
      } else {
        const locationsRes = await api.get(`/collections/${plant.collection_id}/locations`);
        setAvailableLocations(locationsRes.data);
      }
    } catch (error) {
      console.error('Failed to load locations');
    }
  };

  const uploadPhoto = async () => {
    if (!uploadFile) return;
    const formData = new FormData();
    formData.append('photo', uploadFile);
    formData.append('caption', uploadCaption);
    formData.append('setAsThumbnail', setAsThumb);
    try {
      await api.post(`/plants/${plantId}/photos`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowUpload(false);
      setUploadFile(null);
      setUploadCaption('');
      setSetAsThumb(false);
      loadPlantData();
    } catch (error) {
      console.error('Upload failed');
    }
  };

  const logFertilizer = async () => {
    try {
      await api.post(`/plants/${plantId}/fertilize`, { fertilizer_type: fertType, amount: fertAmount, notes: fertNotes });
      setShowFertilize(false);
      setFertType('');
      setFertAmount('');
      setFertNotes('');
      loadPlantData();
    } catch (error) {
      console.error('Failed to log fertilizer');
    }
  };

  const waterPlant = async () => {
    try {
      await api.post(`/plants/${plantId}/water`, {});
      loadPlantData();
    } catch (error) {
      console.error('Failed to log watering');
    }
  };

  const openEditMode = () => {
    const careData = JSON.parse(plant.care_data || '{}');
    setEditName(plant.name);
    setEditNickname(plant.nickname || '');
    setEditLocation(plant.location || '');
    setEditDescription(plant.description || '');
    setEditWatering(careData.watering || '');
    setEditSunlight(Array.isArray(careData.sunlight) ? careData.sunlight.join(', ') : careData.sunlight || '');
    setEditHumidity(careData.humidity || '');
    setEditSoil(careData.soil || '');
    setEditTemperature(careData.temperature || '');
    setShowEdit(true);
  };

  const saveEdit = async () => {
    try {
      const currentCareData = JSON.parse(plant.care_data || '{}');
      await api.put(`/plants/${plantId}`, {
        name: editName,
        nickname: editNickname,
        location: editLocation,
        description: editDescription,
        care_data: {
          watering: editWatering,
          watering_details: currentCareData.watering_details || {},
          sunlight: editSunlight.split(',').map(s => s.trim()).filter(Boolean),
          sunlight_details: currentCareData.sunlight_details || '',
          humidity: editHumidity,
          humidity_details: currentCareData.humidity_details || '',
          soil: editSoil,
          soil_ph: currentCareData.soil_ph || '',
          temperature: editTemperature,
          fertilizer: currentCareData.fertilizer || '',
          pruning: currentCareData.pruning || '',
          repotting: currentCareData.repotting || ''
        }
      });
      setShowEdit(false);
      loadPlantData();
      loadLocations();
    } catch (error) {
      console.error('Update error:', error);
      alert('Failed to update plant: ' + (error.response?.data?.error || error.message));
    }
  };

  const deletePlant = async () => {
    if (!window.confirm(`Delete ${plant.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/plants/${plantId}`);
      navigate(-1);
    } catch (error) {
      alert('Failed to delete plant');
    }
  };

  const setAsThumbnail = async (photoFilename) => {
    try {
      await api.put(`/plants/${plantId}/thumbnail`, { filename: photoFilename });
      loadPlantData();
    } catch (error) {
      alert('Failed to set thumbnail');
    }
  };

  const deletePhoto = async (photoId) => {
    if (!window.confirm('Delete photo?')) return;
    try {
      await api.delete(`/plants/${plantId}/photos/${photoId}`);
      loadPlantData();
    } catch (error) {
      console.error('Failed to delete photo');
    }
  };

  if (!plant) return <div className="page"><div className="loading">Loading...</div></div>;

  const careData = JSON.parse(plant.care_data || '{}');

  return (
    <div className="page">
      <header>
        <button onClick={() => navigate(-1)} className="back-btn">← Back</button>
        <div>
          <h1>🪴 {plant.nickname || plant.name}</h1>
          {plant.nickname && <p style={{ color: 'white', fontSize: '14px', margin: '5px 0 0 0' }}>({plant.name})</p>}
          {plant.location && <p style={{ color: 'white', fontSize: '14px', margin: '5px 0 0 0' }}>📍 {plant.location}</p>}
        </div>
        <button onClick={deletePlant} className="delete-btn" style={{ background: '#e74c3c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer' }}>🗑️ Delete</button>
      </header>

      <div className="plant-details-container">
        <div className="details-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
            <h2>Plant Info</h2>
            <button onClick={openEditMode} className="edit-btn">✏️ Edit</button>
          </div>
          
          {plant.scientific_name && <p className="scientific-name">{plant.scientific_name}</p>}
          
          {plant.description && (
            <div className="plant-description">
              <p>{plant.description}</p>
            </div>
          )}
          
          {plant.source_url && (
            <div className="source-link">
              <strong>Source:</strong>{' '}
              <a href={plant.source_url} target="_blank" rel="noopener noreferrer">
                View original data →
              </a>
            </div>
          )}
          
          <div className="care-details">
            <div className="care-item">
              <strong>💧 Watering:</strong> {careData.watering || 'Unknown'}
              {careData.watering_details && (
                <div style={{ marginTop: '5px', fontSize: '13px', color: '#666' }}>
                  <div>📅 {careData.watering_details.times_per_week}</div>
                  <div>💡 {careData.watering_details.description}</div>
                </div>
              )}
            </div>
            <div className="care-item">
              <strong>☀️ Sunlight:</strong> {Array.isArray(careData.sunlight) ? careData.sunlight.join(', ') : careData.sunlight || 'Unknown'}
              {careData.sunlight_details && <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{careData.sunlight_details}</div>}
            </div>
            <div className="care-item">
              <strong>💨 Humidity:</strong> {careData.humidity || 'Unknown'}
              {careData.humidity_details && <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>{careData.humidity_details}</div>}
            </div>
            <div className="care-item">
              <strong>🌱 Soil:</strong> {careData.soil || 'Well-draining potting mix'}
              {careData.soil_ph && <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>pH: {careData.soil_ph}</div>}
            </div>
            <div className="care-item">
              <strong>🌡️ Temperature:</strong> {careData.temperature || '18-24°C'}
            </div>
            <div className="care-item">
              <strong>🌿 Fertilizer:</strong> {careData.fertilizer || 'Monthly during growing season'}
            </div>
            <div className="care-item">
              <strong>✂️ Pruning:</strong> {careData.pruning || 'As needed'}
            </div>
            <div className="care-item">
              <strong>🪴 Repotting:</strong> {careData.repotting || 'Every 1-2 years'}
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={waterPlant} className="water-btn">💧 Water</button>
            <button onClick={() => setShowFertilize(true)} className="fertilize-btn">🌿 Fertilize</button>
            <button onClick={() => setShowUpload(true)} className="photo-btn">📸 Photo</button>
          </div>
        </div>

        <div className="photos-section">
          <h2>📸 Photos ({photos.length})</h2>
          <div className="photo-grid">
            {photos.map(photo => {
              const isThumbnail = plant?.image_url === `/uploads/${photo.filename}`;
              return (
                <div key={photo.id} className="photo-item">
                  <img src={`/uploads/${photo.filename}`} alt={photo.caption || 'Plant'} />
                  {isThumbnail && <div className="thumbnail-badge">⭐ Thumbnail</div>}
                  {photo.caption && <p className="photo-caption">{photo.caption}</p>}
                  <div className="photo-meta">
                    <span>{photo.uploaded_by}</span>
                    <span>{formatDistanceToNow(new Date(photo.uploaded_at))} ago</span>
                  </div>
                  <div className="photo-actions">
                    {!isThumbnail && (
                      <button onClick={() => setAsThumbnail(photo.filename)} className="thumbnail-btn" title="Set as thumbnail">
                        ⭐
                      </button>
                    )}
                    <button onClick={() => deletePhoto(photo.id)} className="delete-photo-btn" title="Delete photo">🗑️</button>
                  </div>
                </div>
              );
            })}
            {photos.length === 0 && (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', color: '#999' }}>
                No photos yet. Upload your first photo to track growth!
              </div>
            )}
          </div>
        </div>

        <div className="history-section">
          <h2>💧 Watering History</h2>
          <div className="history-list">
            {wateringHistory.slice(0, 5).map(entry => (
              <div key={entry.id} className="history-item">
                <span className="history-date">{new Date(entry.watered_at).toLocaleString()}</span>
                <span className="history-user">{entry.watered_by}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="history-section">
          <h2>🌿 Fertilizer History</h2>
          <div className="history-list">
            {fertilizerHistory.slice(0, 5).map(entry => (
              <div key={entry.id} className="history-item">
                <div>
                  <span className="history-date">{new Date(entry.fertilized_at).toLocaleString()}</span>
                  <span className="history-user">{entry.fertilized_by}</span>
                </div>
                <div className="fertilizer-details">
                  <strong>{entry.fertilizer_type}</strong> - {entry.amount}
                  {entry.notes && <p className="notes">{entry.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showUpload && (
        <div className="modal">
          <div className="modal-content">
            <h2>Upload Photo</h2>
            <input type="file" accept="image/*" onChange={(e) => setUploadFile(e.target.files[0])} />
            <input type="text" placeholder="Caption" value={uploadCaption} onChange={(e) => setUploadCaption(e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={setAsThumb}
                onChange={(e) => setSetAsThumb(e.target.checked)}
              />
              <span>Set as thumbnail</span>
            </label>
            <div className="modal-buttons">
              <button onClick={uploadPhoto} className="confirm-btn">Upload</button>
              <button onClick={() => setShowUpload(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showFertilize && (
        <div className="modal">
          <div className="modal-content">
            <h2>Log Fertilizer</h2>
            <input type="text" placeholder="Type" value={fertType} onChange={(e) => setFertType(e.target.value)} />
            <input type="text" placeholder="Amount" value={fertAmount} onChange={(e) => setFertAmount(e.target.value)} />
            <textarea placeholder="Notes" value={fertNotes} onChange={(e) => setFertNotes(e.target.value)} rows={3} />
            <div className="modal-buttons">
              <button onClick={logFertilizer} className="confirm-btn">Log</button>
              <button onClick={() => setShowFertilize(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Plant</h2>
            <input type="text" placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <input type="text" placeholder="Nickname (optional)" value={editNickname} onChange={(e) => setEditNickname(e.target.value)} />
            <input 
              type="text" 
              placeholder="Location (e.g., Living room, Balcony)" 
              value={editLocation} 
              onChange={(e) => setEditLocation(e.target.value)}
              list="locations"
            />
            <datalist id="locations">
              {availableLocations.map(loc => (
                <option key={loc} value={loc} />
              ))}
            </datalist>
            <textarea placeholder="Description" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            
            <h3 style={{ marginTop: '15px' }}>Care Instructions</h3>
            <input type="text" placeholder="Watering" value={editWatering} onChange={(e) => setEditWatering(e.target.value)} />
            <input type="text" placeholder="Sunlight" value={editSunlight} onChange={(e) => setEditSunlight(e.target.value)} />
            <input type="text" placeholder="Humidity" value={editHumidity} onChange={(e) => setEditHumidity(e.target.value)} />
            <input type="text" placeholder="Soil type" value={editSoil} onChange={(e) => setEditSoil(e.target.value)} />
            <input type="text" placeholder="Temperature range" value={editTemperature} onChange={(e) => setEditTemperature(e.target.value)} />
            
            <div className="modal-buttons">
              <button onClick={saveEdit} className="confirm-btn">Save</button>
              <button onClick={() => setShowEdit(false)} className="cancel-btn">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}