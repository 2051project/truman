import { useState, useEffect, useMemo } from 'react';
import { differenceInYears, addMinutes } from 'date-fns';
import MapComponent from './MapComponent';
import { getNextTargetLocationAndTransport } from './utils/locationService';
import { generateSocialMediaContent } from './utils/geminiService';
import './App.css';

const MOODS = ['Happy', 'Thoughtful', 'Excited', 'Tired', 'Curious', 'Calm'];
const WITHS = ['alone', 'stranger', 'a new friend', 'a friend', 'friends', 'new friends'];

function App() {
  const initialBirthdate = new Date('1986-08-21');
  const initialTime = new Date('2026-02-28T10:00:00');

  // Truman's profile state
  const [profile, setProfile] = useState({
    gender: 'male',
    birthdate: initialBirthdate,
    currentTime: initialTime,
    age: differenceInYears(initialTime, initialBirthdate),
    couple: 'solo',
    address: 'Yongsan',
    mood: 'Calm',
    with: 'alone',
    status: 'stay',
    transportation: 'none',
    targetName: 'Yongsan'
  });

  const [currentLocation, setCurrentLocation] = useState({ lat: 37.532600, lng: 126.990021 }); // Yongsan
  const [targetLocation, setTargetLocation] = useState({ lat: 37.532600, lng: 126.990021 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [googleMapsApiKey, setGoogleMapsApiKey] = useState('');
  const [socialMediaContent, setSocialMediaContent] = useState(null);

  // Recalculate age whenever currentTime changes
  useEffect(() => {
    setProfile(prev => ({
      ...prev,
      age: differenceInYears(prev.currentTime, prev.birthdate)
    }));
  }, [profile.currentTime, profile.birthdate]);


  const handleNextBtn = async () => {
    setIsProcessing(true);

    // 1. Advance time by 20 minutes
    const newTime = addMinutes(profile.currentTime, 20);

    // 2. Set currentLocation to the previous targetLocation
    const newCurrentLocation = { ...targetLocation };
    setCurrentLocation(newCurrentLocation);

    // 3. Determine new target and status
    const result = await getNextTargetLocationAndTransport(newCurrentLocation);

    setTargetLocation(result.targetLocation);

    // Pick random mood and company
    const newMood = MOODS[Math.floor(Math.random() * MOODS.length)];
    const newWith = WITHS[Math.floor(Math.random() * WITHS.length)];

    const updatedProfile = {
      ...profile, // use current profile state since we're in the click handler
      currentTime: newTime,
      status: result.status,
      transportation: result.transportation,
      currentName: profile.targetName,
      targetName: result.targetName,
      mood: newMood,
      with: newWith
    };

    setProfile(updatedProfile);

    // 4. Generate social media post text and image url using Gemini & Pollinations
    const content = await generateSocialMediaContent(geminiApiKey, updatedProfile);
    setSocialMediaContent(content);

    setIsProcessing(false);
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1 className="logo">Project Truman</h1>

        <div className="api-key-panel">
          <input
            type="password"
            placeholder="Gemini API Key"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            className="api-key-input"
            style={{ marginBottom: '10px' }}
          />
          <input
            type="password"
            placeholder="Google Maps API Key"
            value={googleMapsApiKey}
            onChange={(e) => setGoogleMapsApiKey(e.target.value)}
            className="api-key-input"
          />
        </div>

        <div className="control-panel">
          <h2>Time Control</h2>
          <div className="time-display">
            {profile.currentTime.toLocaleString('en-US', {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <button
            className={`next-btn ${isProcessing ? 'processing' : ''}`}
            onClick={handleNextBtn}
            disabled={isProcessing}
          >
            {isProcessing ? 'Simulating...' : 'Next (+20 mins)'}
          </button>
        </div>

        <div className="profile-card">
          <h2>Truman's Profile</h2>
          <ul className="profile-stats">
            <li><span>Gender</span> {profile.gender}</li>
            <li><span>Birthdate</span> {profile.birthdate.toLocaleDateString()}</li>
            <li><span>Age</span> {profile.age}</li>
            <li><span>Relationship</span> {profile.couple}</li>
            <li><span>Home</span> {profile.address}</li>
            <li><span>Mood</span> {profile.mood}</li>
            <li><span>With</span> {profile.with}</li>
            <li><span>Status</span> {profile.status}</li>
          </ul>
        </div>
      </div>

      <div className="map-view">
        <MapComponent
          location={currentLocation}
          profile={profile}
          socialMediaContent={socialMediaContent}
          googleMapsApiKey={googleMapsApiKey}
        />
      </div>
    </div>
  );
}

export default App;
