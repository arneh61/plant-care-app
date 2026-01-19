import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from './Auth';

export default function PlantDoctor() {
  const { collectionId } = useParams();
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const askDoctor = async () => {
    if (!question) return;
    setLoading(true);
    try {
      const response = await api.post('/plant-doctor', { question });
      setAnswer(response.data.answer);
    } catch (error) {
      setAnswer('Sorry, the plant doctor is unavailable right now.');
    }
    setLoading(false);
  };

  return (
    <div className="page">
      <header>
        <button onClick={() => navigate(`/collections/${collectionId}`)} className="back-btn">
          ← Back
        </button>
        <h1>🩺 Plant Doctor</h1>
      </header>

      <div className="doctor-container">
        <div className="question-box">
          <textarea
            placeholder="Ask me anything about plant care, diseases, or problems..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={4}
          />
          <button onClick={askDoctor} disabled={loading}>
            {loading ? 'Thinking...' : 'Ask Doctor'}
          </button>
        </div>

        {answer && (
          <div className="answer-box">
            <h3>Diagnosis & Advice:</h3>
            <p>{answer}</p>
          </div>
        )}

        <div className="common-issues">
          <h3>Common Issues:</h3>
          <button onClick={() => setQuestion('My plant has yellow leaves, what should I do?')}>
            Yellow Leaves
          </button>
          <button onClick={() => setQuestion('Brown tips on my plant leaves')}>
            Brown Tips
          </button>
          <button onClick={() => setQuestion('My plant is wilting')}>
            Wilting
          </button>
          <button onClick={() => setQuestion('White spots on leaves')}>
            White Spots
          </button>
        </div>
      </div>
    </div>
  );
}