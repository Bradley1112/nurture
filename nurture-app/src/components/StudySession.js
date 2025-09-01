import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PomodoroClock from './PomodoroClock';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Placeholder for calming music
// const audio = new Audio('/path/to/calming-music.mp3');

const StudySession = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { studyTime, breakTime, sessionId, topicId, subjectId } = location.state || {};

    const [mode, setMode] = useState('Study'); // 'Study' or 'Rest'
    const [totalSeconds, setTotalSeconds] = useState(studyTime * 60);
    const [isActive, setIsActive] = useState(true);

    useEffect(() => {
        let interval = null;
        if (isActive && totalSeconds > 0) {
            interval = setInterval(() => {
                setTotalSeconds(seconds => seconds - 1);
            }, 1000);
        } else if (totalSeconds === 0) {
            if (mode === 'Study') {
                // Time to rest
                setMode('Rest');
                setTotalSeconds(breakTime * 60);
                // audio.play(); // Play calming music
            } else {
                // Rest is over, session finished
                setIsActive(false);
                // audio.pause();
                // audio.currentTime = 0;
                handleSessionEnd();
            }
        }
        return () => clearInterval(interval);
    }, [isActive, totalSeconds, mode, breakTime]);

    const handleSessionEnd = async () => {
        if (sessionId) {
            const db = getFirestore();
            const sessionRef = doc(db, 'users', getAuth().currentUser.uid, 'studyPlan', sessionId);
            await updateDoc(sessionRef, {
                status: 'completed'
            });
        }
        // For Part 8: Re-evaluate expertise and adjust study plan
        console.log('Session ended. Placeholder for Part 8 evaluation.');
        navigate('/dashboard'); // Navigate back to dashboard after session
    };

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (!studyTime) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#1A241B', color: '#F5F5F5' }}>
                <p>No session data. Please start a session from the setup page.</p>
                <button onClick={() => navigate('/dashboard')} className="ml-4 px-4 py-2 rounded-md" style={{ backgroundColor: '#49B85B' }}>Go to Dashboard</button>
            </div>
        );
    }

    if (mode === 'Rest') {
        return (
            <div 
                className="min-h-screen flex flex-col items-center justify-center text-white p-4"
                style={{
                    backgroundImage: `url(/images/background1.jpg)`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                }}
            >
                <div className="bg-black bg-opacity-50 p-10 rounded-lg text-center">
                    <h1 className="text-4xl font-bold mb-4">Rest Time</h1>
                    <p className="text-lg mb-6">Relax and recharge. Your break is almost over.</p>
                    <div className="text-6xl font-bold">
                        {minutes < 10 ? `0${minutes}` : minutes}:{seconds < 10 ? `0${seconds}` : seconds}
                    </div>
                    <p className="mt-6">Calming music is playing...</p> {/* Placeholder */}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center space-y-10" style={{ backgroundColor: '#1A241B', color: '#F5F5F5' }}>
            <PomodoroClock 
                minutes={minutes} 
                seconds={seconds} 
                mode={mode} 
                topic={topicId.replace(/_/g, ' ')} 
            />
            {/* Placeholder for Part 7: Actual study content goes here */}
            <div className="w-full max-w-3xl text-center p-4 bg-gray-800 rounded-lg" style={{ backgroundColor: '#386641' }}>
                <h2 className="text-2xl font-bold">Study Content Area</h2>
                <p className="mt-2">The learning and practice session content from Part 7 will be displayed here.</p>
            </div>
            <button onClick={handleSessionEnd} className="px-6 py-2 rounded-md" style={{ backgroundColor: '#49B85B' }}>
                End Session Early
            </button>
        </div>
    );
};

export default StudySession;
