import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { addStudySession } from "../firebase/study"; // We will create this function

const StudySessionSetup = () => {
  const [duration, setDuration] = useState(60);
  const [focusLevel, setFocusLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [expertise, setExpertise] = useState("");
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { topicId, subjectId } = location.state || {};

  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchExpertise = async () => {
      if (user && topicId) {
        const db = getFirestore();
        // Path according to README: users/{userId}/subjects/{subjectId}/topics/{topicId}
        const topicPath = `users/${user.uid}/subjects/${subjectId}/topics/${topicId}`;
        console.log(`StudySessionSetup: Fetching expertise from path: ${topicPath}`);

        const topicRef = doc(
          db,
          "users",
          user.uid,
          "subjects",
          subjectId,
          "topics",
          topicId
        );
        const topicSnap = await getDoc(topicRef);
        if (topicSnap.exists()) {
          // Normalize to lowercase for consistency
          const level = topicSnap.data().expertiseLevel;
          const normalizedLevel = level ? level.toLowerCase() : "beginner";
          console.log(`StudySessionSetup: Loaded expertise level: ${level} → ${normalizedLevel}`);
          setExpertise(normalizedLevel);
        } else {
          console.log(`StudySessionSetup: No topic data found at path, defaulting to beginner`);
          setExpertise("beginner"); // Default if not evaluated
        }
      }
    };
    fetchExpertise();
  }, [user, topicId, subjectId]);

  const expertiseColorMapping = {
    beginner: "text-red-500",
    apprentice: "text-yellow-500",
    pro: "text-green-500",
    "grand master": "text-blue-500",
    grandmaster: "text-blue-500", // Handle both formats
  };

  const handleStartSession = async () => {
    if (!user) {
      setError("You must be logged in to start a session.");
      return;
    }
    if (!topicId || !subjectId) {
      setError("Topic or subject not selected.");
      return;
    }
    if (!expertise) {
      setError("Loading expertise level, please wait...");
      return;
    }

    // Simple logic to adjust session based on user input
    // Placeholder for more complex AI-driven logic
    let sessionMinutes = duration;
    if (stressLevel > 3) {
      sessionMinutes *= 0.8; // Reduce time if stressed
    }
    if (focusLevel < 3) {
      sessionMinutes *= 0.9; // Reduce time if not focused
    }
    const studyTime = Math.round(sessionMinutes * 0.75); // e.g., 45 mins study
    const breakTime = Math.round(sessionMinutes * 0.25); // e.g., 15 mins break

    try {
      const sessionData = {
        subjectId,
        topicId,
        requestedDuration: duration,
        actualDuration: Math.round(sessionMinutes),
        focusLevel,
        stressLevel,
        expertise,
        // Per README: determine intensity, method, content coverage
        // This is a placeholder for the agentic part
        intensity: stressLevel > 3 ? "low" : "high",
        studyMethod: "pomodoro",
        contentToCover: "Placeholder: AI will determine this.",
      };

      const sessionId = await addStudySession(user.uid, sessionData);

      console.log(`StudySessionSetup: Starting session with expertise level: ${expertise}`);

      navigate("/study-session", {
        state: {
          studyTime: studyTime,
          breakTime: breakTime,
          sessionId: sessionId,
          topicId: topicId,
          subjectId: subjectId,
          focusLevel: focusLevel,
          stressLevel: stressLevel,
          expertiseLevel: expertise, // Should be loaded by now due to validation
        },
      });
    } catch (e) {
      console.error("Error starting study session:", e);
      setError("Failed to start study session. Please try again.");
    }
  };

  if (!topicId) {
    return (
      <div className="text-center text-red-500">
        Error: No topic selected. Please go back to the dashboard.
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#1A241B",
        color: "#F5F5F5",
        paddingLeft: "20px",
        paddingRight: "20px",
      }}
    >
      <div className="w-full max-w-2xl p-8 space-y-10 rounded-lg">
        <h1 className="text-3xl font-bold text-center">
          Prepare Your Study Session
        </h1>

        <div className="text-center text-xl">
          <p>
            Topic:{" "}
            <span className="font-semibold">
              {topicId
                .replace(/_/g, " ")
                .split(" ")
                .map((word) => {
                  return word.charAt(0).toUpperCase() + word.slice(1);
                })
                .join(" ")}
            </span>
          </p>

          <p>
            Your Expertise:{" "}
            <span
              className={`font-bold ${
                expertiseColorMapping[expertise] || "text-gray-300"
              }`}
            >
              {expertise
                ? expertise.charAt(0).toUpperCase() + expertise.slice(1)
                : "Loading..."}
            </span>
          </p>
        </div>

        {/* Duration Selection */}
        <div className="space-y-2">
          <label className="text-lg">How much time do you have?</label>
          <div className="flex justify-around">
            {[30, 60, 120].map((d) => (
              <button
                key={d}
                onClick={() => setDuration(d)}
                className={`px-4 py-2 rounded-md ${
                  duration === d ? "bg-green-600" : "bg-gray-700"
                } hover:bg-green-700`}
              >
                {d} mins
              </button>
            ))}
          </div>
        </div>
        <div>
          <text></text>
        </div>

        {/* Focus Level */}
        <div className="space-y-2">
          <label htmlFor="focus" className="text-lg">
            Focus Level: {focusLevel}
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="focus"
              type="range"
              min="1"
              max="5"
              value={focusLevel}
              onChange={(e) => setFocusLevel(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{ maxWidth: "30%" }}
            />
          </div>
        </div>

        {/* Stress Level */}
        <div className="space-y-2">
          <label htmlFor="stress" className="text-lg">
            Stress Level: {stressLevel}
          </label>
          <div className="flex items-center space-x-4">
            <input
              id="stress"
              type="range"
              min="1"
              max="5"
              value={stressLevel}
              onChange={(e) => setStressLevel(Number(e.target.value))}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{ maxWidth: "30%" }}
            />
          </div>
        </div>

        {error && <p className="text-red-500 text-center">{error}</p>}

        <button
          onClick={handleStartSession}
          className="w-full py-3 mt-6 font-semibold rounded-md"
          style={{ backgroundColor: "#49B85B" }}
        >
          Start Session
        </button>
      </div>
    </div>
  );
};

export default StudySessionSetup;
