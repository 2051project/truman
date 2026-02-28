import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, OverlayView } from '@react-google-maps/api';

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

// Custom Speech Bubble Component
const SpeechBubble = ({ profile }) => {
    return (
        <div className="speech-bubble">
            <div className="bubble-header">
                <span className="profile-name">Truman</span>
                <span className="profile-age">{profile.age} {profile.gender === 'male' ? '♂' : '♀'}</span>
            </div>
            <div className="bubble-body">
                <p><strong>Time:</strong> {profile.currentTime.toLocaleString()}</p>
                <p><strong>With:</strong> {profile.with}</p>
                <p><strong>Location:</strong> {profile.currentName || profile.address}</p>
                <p><strong>Status:</strong> {profile.status === 'move' ? `Heading to ${profile.targetName} by ${profile.transportation}` : 'Staying here'}</p>
                <p><strong>Mood:</strong> {profile.mood}</p>
            </div>
            <div className="bubble-tail"></div>
        </div>
    );
};

// Component for the new Social Media Image Bubble
const SocialMediaBubble = ({ content }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        setImageLoaded(false);
        setImageFailed(false);

        const url = content?.imageUrl;
        if (!url) {
            // 이미지가 없으면 스피너를 끄고 텍스트만 보여주기
            setImageLoaded(true);
            return;
        }

        let cancelled = false;
        const img = new Image();

        const timeoutId = setTimeout(() => {
            if (!cancelled) {
                console.warn("Image load timeout:", url);
                setImageFailed(true);
                setImageLoaded(true); // 스피너 종료
            }
        }, 15000);

        img.onload = () => {
            if (cancelled) return;
            clearTimeout(timeoutId);
            setImageLoaded(true);
        };

        img.onerror = (e) => {
            if (cancelled) return;
            clearTimeout(timeoutId);
            console.warn("Image load error:", url, e);
            setImageFailed(true);
            setImageLoaded(true); // 스피너 종료
        };

        // 캐시/동일 URL 이슈 방지: 필요하면 key나 querystring도 같이 고려
        img.src = url;

        return () => {
            cancelled = true;
            clearTimeout(timeoutId);
        };
    }, [content?.imageUrl]);

    if (!content) return null;

    return (
        <div className="social-bubble">
            {content.imageUrl && (
                <>
                    {!imageLoaded && (
                        <div className="image-loading-placeholder">
                            <span className="spinner"></span>
                            Generating view...
                        </div>
                    )}

                    <img
                        key={content.imageUrl}                 // URL 바뀌면 확실히 새로 마운트
                        src={content.imageUrl}
                        alt="Truman's View"
                        className="social-photo"
                        style={{
                            opacity: imageLoaded && !imageFailed ? 1 : 0,
                            visibility: imageLoaded && !imageFailed ? "visible" : "hidden",
                            transition: "opacity 200ms ease",
                        }}
                    />

                    {imageLoaded && imageFailed && (
                        <div className="image-loading-placeholder">
                            Image failed to load 🙃
                        </div>
                    )}
                </>
            )}

            <div className="social-caption">{content.text}</div>
            <div className="bubble-tail-right"></div>
        </div>
    );
};

const InnerMapComponent = ({ location, profile, socialMediaContent, googleMapsApiKey }) => {
    // We only attempt to load the map if we have an API key!
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: googleMapsApiKey
    });

    const [map, setMap] = useState(null);

    const onLoad = React.useCallback(function callback(map) {
        setMap(map);
    }, []);

    const onUnmount = React.useCallback(function callback(map) {
        setMap(null);
    }, []);

    // Pan to location when it changes
    useEffect(() => {
        if (map && location) {
            map.panTo(location);
        }
    }, [map, location]);

    const defaultCenter = location || { lat: 37.532600, lng: 126.990021 }; // Yongsan approx

    if (loadError) {
        return <div className="loading-map">Error loading maps. Check your API Key.</div>;
    }

    return isLoaded ? (
        <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={defaultCenter}
            zoom={14}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
                disableDefaultUI: true,
                styles: [
                    // Add some modern map styles
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }]
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }]
                    },
                    {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }]
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }]
                    }
                ]
            }}
        >
            { /* Render Speech Bubble at Truman's Location */}
            <OverlayView
                position={location}
                mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                getPixelPositionOffset={(x, y) => ({ x: -160, y: -260 })} // Adjust offset to point to location
            >
                <SpeechBubble profile={profile} />
            </OverlayView>

            { /* Render Social Media Image and Text Bubble at Truman's Location (offset to the right) */}
            {socialMediaContent && (
                <OverlayView
                    position={location}
                    mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                    getPixelPositionOffset={(x, y) => ({ x: 180, y: -220 })} // Offset to the right
                >
                    <SocialMediaBubble content={socialMediaContent} />
                </OverlayView>
            )}

            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '20px',
                height: '20px',
                backgroundColor: '#ff4d4f',
                borderRadius: '50%',
                border: '3px solid white',
                boxShadow: '0 0 10px rgba(255, 77, 79, 0.8)',
                pointerEvents: 'none',
                zIndex: 0
            }}
            />
        </GoogleMap>
    ) : <div className="loading-map">Loading Map...</div>;
};

const MapComponent = ({ location, profile, socialMediaContent, googleMapsApiKey }) => {
    if (!googleMapsApiKey) {
        return <div className="loading-map">Please enter a Google Maps API Key.</div>;
    }

    // We add key={googleMapsApiKey} so that if the user pastes a different key later, 
    // it completely remounts the inner component and useJsApiLoader gets a fresh start.
    return (
        <InnerMapComponent
            key={googleMapsApiKey}
            location={location}
            profile={profile}
            socialMediaContent={socialMediaContent}
            googleMapsApiKey={googleMapsApiKey}
        />
    );
};

export default React.memo(MapComponent);