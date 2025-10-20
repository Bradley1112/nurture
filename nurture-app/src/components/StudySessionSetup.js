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
      className="study-session-setup min-h-screen flex items-center"
      style={{
        background: "linear-gradient(135deg, #1E2B22 0%, #0f1419 100%)",
        color: "#F5F5F5",
        padding: "24px 20px 24px 60px",
      }}
    >
      <div style={{
        background: "rgba(255, 255, 255, 0.03)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(139, 195, 74, 0.2)",
        borderRadius: "20px",
        padding: "32px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        maxWidth: "600px",
        width: "100%"
      }}>
        {/* Compact Header */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{
            fontSize: "28px",
            fontWeight: "700",
            background: "linear-gradient(135deg, #A5D6A7 0%, #66BB6A 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: "6px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px"
          }}>
            <span>📚</span>
            <span>Prepare Your Study Session</span>
          </h1>
        </div>

        {/* Compact Topic Info */}
        <div style={{
          background: "rgba(139, 195, 74, 0.08)",
          border: "1px solid rgba(139, 195, 74, 0.25)",
          borderRadius: "12px",
          padding: "16px 20px",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}>
          <div>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13px", display: "block", marginBottom: "4px" }}>Topic</span>
            <h3 style={{
              fontSize: "17px",
              fontWeight: "600",
              color: "#C5E1A5",
              margin: 0
            }}>
              {topicId
                .replace(/_/g, " ")
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ")}
            </h3>
          </div>

          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px"
          }}>
            <span style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "13px" }}>Level:</span>
            <div style={{
              padding: "4px 12px",
              borderRadius: "16px",
              fontSize: "13px",
              fontWeight: "600",
              background: expertise === "Beginner" ? "rgba(239, 68, 68, 0.2)" :
                         expertise === "Apprentice" ? "rgba(245, 158, 11, 0.2)" :
                         expertise === "Pro" ? "rgba(34, 197, 94, 0.2)" :
                         expertise === "Grand Master" ? "rgba(59, 130, 246, 0.2)" : "rgba(107, 114, 128, 0.2)",
              border: expertise === "Beginner" ? "1px solid #ef4444" :
                     expertise === "Apprentice" ? "1px solid #f59e0b" :
                     expertise === "Pro" ? "1px solid #22c55e" :
                     expertise === "Grand Master" ? "1px solid #3b82f6" : "1px solid #6b7280",
              color: expertise === "Beginner" ? "#ff6666" :
                    expertise === "Apprentice" ? "#ffbb33" :
                    expertise === "Pro" ? "#44dd66" :
                    expertise === "Grand Master" ? "#4499ff" : "#9ca3af"
            }}>
              {expertise || "Loading..."}
            </div>
          </div>
        </div>

        {/* Vertical Layout for Settings */}
        {/* Duration Selection */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{
            fontSize: "15px",
            fontWeight: "600",
            color: "#C5E1A5",
            display: "block",
            marginBottom: "12px"
          }}>
            ⏱️ Study Duration
          </label>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "8px"
          }}>
            {[
              { value: 30, label: "30m" },
              { value: 60, label: "60m" },
              { value: 120, label: "120m" }
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setDuration(value)}
                aria-label={`Select ${label} study session`}
                aria-pressed={duration === value}
                style={{
                  padding: "12px 8px",
                  borderRadius: "8px",
                  border: duration === value ? "2px solid #66BB6A" : "1px solid rgba(255, 255, 255, 0.1)",
                  background: duration === value ? "rgba(102, 187, 106, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: duration === value ? "#A5D6A7" : "rgba(255, 255, 255, 0.7)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontSize: "14px",
                  fontWeight: duration === value ? "600" : "500",
                  textAlign: "center"
                }}
                onMouseEnter={(e) => {
                  if (duration !== value) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (duration !== value) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
                  }
                }}
              >
                {duration === value && "✓ "}{label}
              </button>
            ))}
          </div>
        </div>

        {/* Focus Level - Segmented Control */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#C5E1A5"
            }}>
              🎯 Focus Level
            </label>
            <span style={{
              fontSize: "13px",
              color: "#A5D6A7",
              fontWeight: "600"
            }}>
              {focusLevel}/5
            </span>
          </div>

          <div style={{
            display: "flex",
            gap: "6px",
            marginBottom: "6px"
          }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setFocusLevel(level)}
                aria-label={`Set focus level to ${level}`}
                aria-pressed={focusLevel >= level}
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "6px",
                  border: "none",
                  background: focusLevel >= level
                    ? "linear-gradient(135deg, #66BB6A 0%, #8BC34A 100%)"
                    : "rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: focusLevel >= level ? "white" : "rgba(255, 255, 255, 0.4)"
                }}
                onMouseEnter={(e) => {
                  if (focusLevel < level) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (focusLevel < level) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.5)"
          }}>
            <span>Low</span>
            <span>High</span>
          </div>
        </div>

        {/* Energy Level - Segmented Control */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <label style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "#C5E1A5"
            }}>
              ⚡ Energy Level
            </label>
            <span style={{
              fontSize: "13px",
              color: "#A5D6A7",
              fontWeight: "600"
            }}>
              {stressLevel}/5
            </span>
          </div>

          <div style={{
            display: "flex",
            gap: "6px",
            marginBottom: "6px"
          }}>
            {[1, 2, 3, 4, 5].map((level) => (
              <button
                key={level}
                onClick={() => setStressLevel(level)}
                aria-label={`Set energy level to ${level}`}
                aria-pressed={stressLevel >= level}
                style={{
                  flex: 1,
                  height: "36px",
                  borderRadius: "6px",
                  border: "none",
                  background: stressLevel >= level
                    ? "linear-gradient(135deg, #66BB6A 0%, #8BC34A 100%)"
                    : "rgba(255, 255, 255, 0.08)",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "13px",
                  fontWeight: "600",
                  color: stressLevel >= level ? "white" : "rgba(255, 255, 255, 0.4)"
                }}
                onMouseEnter={(e) => {
                  if (stressLevel < level) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (stressLevel < level) {
                    e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                  }
                }}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "rgba(255, 255, 255, 0.5)"
          }}>
            <span>Tired</span>
            <span>Energized</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "16px",
            color: "#ff6666",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "8px"
          }} role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Start Button */}
        <button
          onClick={handleStartSession}
          aria-label="Start study session"
          style={{
            width: "100%",
            padding: "12px 24px",
            fontSize: "15px",
            fontWeight: "600",
            background: "linear-gradient(135deg, #66BB6A 0%, #8BC34A 100%)",
            color: "white",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 3px 12px rgba(102, 187, 106, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 5px 20px rgba(102, 187, 106, 0.4)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 3px 12px rgba(102, 187, 106, 0.3)";
          }}
        >
          <span>🚀</span>
          <span>Start Study Session</span>
        </button>
      </div>
    </div>
  );
};

export default StudySessionSetup;
