import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore } from "firebase/firestore";

function Dashboard({ user }) {
  const navigate = useNavigate();
  const [evaluatedTopics, setEvaluatedTopics] = useState({});
  const [loading, setLoading] = useState(true);

  // All subjects and topics as specified in Part 5
  const allSubjects = [
    {
      id: "physics",
      name: "Physics (SEAB Syllabus 6091)",
      topics: [{ id: "kinematics", name: "Kinematics" }],
    },
    {
      id: "elementary_mathematics",
      name: "Elementary Mathematics (SEAB Syllabus 4048)",
      topics: [
        {
          id: "algebra_solving_linearquadratic_equations", // Matches Firebase sanitization
          name: "Solving Linear/Quadratic Equations",
        },
        {
          id: "algebra_simplifying_expressions",
          name: "Simplifying Expressions",
        },
      ],
    },
    {
      id: "english_language",
      name: "English Language (SEAB Syllabus 1128)",
      topics: [
        {
          id: "reading_comprehension",
          name: "Reading Comprehension",
        },
      ],
    },
  ];

  // Helper function to sanitize names for Firestore paths (MUST match EvaluationQuiz exactly)
  const sanitizeForFirestore = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  };

  useEffect(() => {
    const fetchEvaluatedTopics = async () => {
      console.log("=== Dashboard: Starting to fetch evaluated topics ===");
      console.log("Dashboard: User ID:", user?.uid);
      if (!user) {
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const evaluatedTopicsData = {};

      console.log("Dashboard: Will check these subject IDs:", allSubjects.map(s => s.id));

      try {
        // First, let's discover what subjects actually exist in the database
        const { collection, getDocs } = await import("firebase/firestore");

        // Check each predefined subject for evaluated topics
        for (const subject of allSubjects) {
          const subjectKey = subject.id;
          evaluatedTopicsData[subjectKey] = {};

          // Try multiple possible subject name formats
          const possibleSubjectNames = [
            subject.id, // original id like 'english_language'
            sanitizeForFirestore(subject.name), // sanitized full name
            subject.name
              .toLowerCase()
              .split("(")[0]
              .trim()
              .replace(/\s+/g, "_"), // just the subject part
          ];

          console.log(`\n--- Checking subject: ${subject.name} (ID: ${subject.id}) ---`);
          console.log("Dashboard: Will try these subject paths:", possibleSubjectNames);

          let foundSubjectData = false;

          for (const subjectName of possibleSubjectNames) {
            try {
              console.log(
                `Dashboard: Trying subject path: users/${user.uid}/subjects/${subjectName}`
              );

              // Try to get all topics for this subject
              const topicsCollection = collection(
                db,
                "users",
                user.uid,
                "subjects",
                subjectName,
                "topics"
              );
              const topicsSnapshot = await getDocs(topicsCollection);

              if (!topicsSnapshot.empty) {
                console.log(
                  `Dashboard: ✅✅✅ FOUND subject data at ${subjectName} with ${topicsSnapshot.size} topics`
                );
                foundSubjectData = true;

                // Map found topics back to our predefined topics
                topicsSnapshot.forEach((topicDoc) => {
                  const topicData = topicDoc.data();
                  const firebaseTopicId = topicDoc.id;

                  console.log(
                    `Dashboard: 📍 Found topic in Firebase: ${firebaseTopicId}`,
                    topicData
                  );
                  console.log(`  - expertiseLevel: ${topicData.expertiseLevel}`);

                  // Find matching topic in our predefined topics
                  // Match using the originalTopicName stored in Firebase or sanitized name
                  console.log(`  - Trying to match against dashboard topics:`, subject.topics.map(t => ({id: t.id, name: t.name})));

                  const matchingTopic = subject.topics.find((topic) => {
                    // Strategy 1: Check if firebaseTopicId directly matches topic.id
                    if (firebaseTopicId === topic.id) {
                      console.log(`    ✅ Direct ID match: ${firebaseTopicId} === ${topic.id}`);
                      return true;
                    }

                    // Strategy 2: Compare sanitized originalTopicName with sanitized topic.name
                    if (topicData.originalTopicName) {
                      const sanitizedOriginal = sanitizeForFirestore(topicData.originalTopicName);
                      const sanitizedDashboard = sanitizeForFirestore(topic.name);

                      // Also try removing common prefixes like "Algebra: "
                      const cleanedOriginal = topicData.originalTopicName
                        .replace(/^[A-Za-z]+:\s*/, '') // Remove "Algebra: " or similar
                        .toLowerCase();
                      const cleanedDashboard = topic.name.toLowerCase();

                      const match = sanitizedOriginal === sanitizedDashboard ||
                                    sanitizeForFirestore(cleanedOriginal) === sanitizeForFirestore(cleanedDashboard) ||
                                    cleanedOriginal === cleanedDashboard;

                      console.log(`    • Comparing originalTopicName "${topicData.originalTopicName}" vs topic.name "${topic.name}": ${match}`);
                      if (match) return true;
                    }

                    // Strategy 3: Compare firebaseTopicId with sanitized topic.name
                    const sanitizedTopicName = sanitizeForFirestore(topic.name);
                    const match = firebaseTopicId === sanitizedTopicName;
                    console.log(`    • Checking if "${firebaseTopicId}" matches sanitized topic.name "${sanitizedTopicName}": ${match}`);
                    return match;
                  });

                  if (matchingTopic) {
                    // Normalize expertise level to lowercase for consistency
                    const expertiseLevel = topicData.expertiseLevel
                      ? topicData.expertiseLevel.toLowerCase()
                      : "not evaluated";

                    evaluatedTopicsData[subjectKey][matchingTopic.id] = {
                      expertiseLevel: expertiseLevel,
                      evaluationScore:
                        topicData.evaluationScore || topicData.score || 0,
                      lastStudied:
                        topicData.lastStudied || topicData.lastEvaluated,
                      isEvaluated: true,
                    };
                    console.log(
                      `Dashboard: ✅✅✅ MATCHED and mapped ${firebaseTopicId} → ${matchingTopic.id}`,
                      evaluatedTopicsData[subjectKey][matchingTopic.id]
                    );
                  } else {
                    console.error(`Dashboard: ❌❌❌ FAILED to match topic ${firebaseTopicId}`);
                    // If we can't match, create a best-guess mapping
                    console.log(
                      `Dashboard: ⚠️ Could not match topic ${firebaseTopicId} to predefined topics`
                    );
                    // Use the first topic as fallback if there's only one
                    if (subject.topics.length === 1) {
                      const fallbackTopic = subject.topics[0];
                      // Normalize expertise level for fallback too
                      const expertiseLevel = topicData.expertiseLevel
                        ? topicData.expertiseLevel.toLowerCase()
                        : "not evaluated";

                      evaluatedTopicsData[subjectKey][fallbackTopic.id] = {
                        expertiseLevel: expertiseLevel,
                        evaluationScore:
                          topicData.evaluationScore || topicData.score || 0,
                        lastStudied:
                          topicData.lastStudied || topicData.lastEvaluated,
                        isEvaluated: true,
                      };
                      console.log(
                        `Dashboard: ✅ Fallback mapped ${firebaseTopicId} to ${fallbackTopic.id}`
                      );
                    }
                  }
                });
                break; // Found data for this subject, no need to try other names
              }
            } catch (error) {
              console.log(
                `Dashboard: No data found for subject ${subjectName}:`,
                error.message
              );
            }
          }

          // If no data found for any subject name variant, mark all topics as not evaluated
          if (!foundSubjectData) {
            for (const topic of subject.topics) {
              evaluatedTopicsData[subjectKey][topic.id] = {
                expertiseLevel: "Not Evaluated",
                evaluationScore: 0,
                lastStudied: null,
                isEvaluated: false,
              };
            }
            console.log(
              `Dashboard: ❌ No data found for any variant of subject ${subject.name}`
            );
          }
        }

        console.log("\n=== Dashboard: FINAL evaluated topics data ===");
        console.log(JSON.stringify(evaluatedTopicsData, null, 2));
        setEvaluatedTopics(evaluatedTopicsData);
      } catch (error) {
        console.error("Dashboard: ❌ Error fetching evaluated topics:", error);
      }

      setLoading(false);
    };

    fetchEvaluatedTopics();
  }, [user]);

  const handleStartStudying = (subjectId, topicId) => {
    navigate("/study-setup", { state: { subjectId, topicId } });
  };

  const getFirstName = () => {
    if (user?.displayName) return user.displayName.split(" ")[0];
    if (user?.email) return user.email.split("@")[0];
    return "Student";
  };

  const getExpertiseColors = (level) => {
    // Normalize the level to handle case-insensitive matching
    const normalizedLevel = level ? level.toLowerCase().trim() : "";

    const colorMap = {
      beginner: {
        bg: "rgba(239, 68, 68, 0.3)",
        border: "#ef4444",
        text: "#ff6666", // Brighter red
        dot: "#ef4444",
      },
      apprentice: {
        bg: "rgba(245, 158, 11, 0.3)",
        border: "#f59e0b",
        text: "#ffbb33", // Brighter orange
        dot: "#f59e0b",
      },
      pro: {
        bg: "rgba(34, 197, 94, 0.3)",
        border: "#22c55e",
        text: "#44dd66", // Brighter green
        dot: "#22c55e",
      },
      "grand master": {
        bg: "rgba(59, 130, 246, 0.3)",
        border: "#3b82f6",
        text: "#4499ff", // Brighter blue
        dot: "#3b82f6",
      },
      "not evaluated": {
        bg: "rgba(107, 114, 128, 0.2)",
        border: "#6b7280",
        text: "#9ca3af", // Lighter gray
        dot: "#6b7280",
      },
    };

    return colorMap[normalizedLevel] || colorMap["not evaluated"];
  };

  const getTopicData = (subjectId, topicId) => {
    return (
      evaluatedTopics[subjectId]?.[topicId] || {
        expertiseLevel: "Not Evaluated",
        isEvaluated: false,
      }
    );
  };

  return (
    <div
      className="min-h-screen dashboard-container-main"
      style={{
        background: "linear-gradient(135deg, #1E2B22 0%, #0f1419 100%)",
        color: "#F5F5F5",
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingBottom: "80px",
        overflowX: "hidden"
      }}
    >
      {/* Header Section */}
      <div className="dashboard-header" style={{
        padding: "40px 32px 24px",
        textAlign: "center"
      }}>
        <div className="max-w-7xl mx-auto">
          <div className="welcome-logo" style={{
            fontSize: "40px",
            marginBottom: "12px",
            display: "inline-block"
          }}>🌱</div>
          <h1
            className="dashboard-title"
            style={{
              background: "linear-gradient(135deg, #A5D6A7 0%, #66BB6A 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              fontSize: "36px",
              fontWeight: "700",
              letterSpacing: "-0.5px",
              marginBottom: "12px"
            }}
          >
            Welcome Back, {getFirstName()}!
          </h1>
          <p className="dashboard-subtitle" style={{
            fontSize: "16px",
            color: "rgba(255, 255, 255, 0.75)",
            lineHeight: "1.5",
            marginBottom: "0"
          }}>
            Ready to nurture your knowledge and grow your expertise?
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-full mx-auto">
          <div className="mb-8">

            {/* Mastery Level Legend - Compact */}
            <div
              className="mastery-progression-card"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(139, 195, 74, 0.15)",
                borderRadius: "12px",
                padding: "20px 32px",
                margin: "24px auto",
                maxWidth: "1000px",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3 className="mastery-title" style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#A5D6A7",
                textAlign: "center",
                marginBottom: "20px",
                letterSpacing: "-0.3px"
              }}>
                Mastery Progression
              </h3>
              <div className="mastery-levels" style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                flexWrap: "wrap"
              }}>
                {[
                  { emoji: "⚪️", label: "Not Evaluated", color: "#9ca3af" },
                  { emoji: "🔴", label: "Beginner", color: "#ef4444" },
                  { emoji: "🟠", label: "Apprentice", color: "#f59e0b" },
                  { emoji: "🟢", label: "Pro", color: "#22c55e" },
                  { emoji: "🔵", label: "Grand Master", color: "#3b82f6" }
                ].map((level, index, array) => (
                  <React.Fragment key={level.label}>
                    <div style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px"
                    }}>
                      <div style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        border: `2px solid ${level.color}`,
                        background: `${level.color}20`
                      }}>
                        {level.emoji}
                      </div>
                      <span style={{
                        fontSize: "10px",
                        color: "rgba(255, 255, 255, 0.7)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        fontWeight: "500"
                      }}>
                        {level.label}
                      </span>
                    </div>
                    {index < array.length - 1 && (
                      <div style={{
                        width: "24px",
                        height: "2px",
                        background: "rgba(255, 255, 255, 0.2)",
                        margin: "0 2px"
                      }} />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-300">Loading your subjects...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Fixed 3-Column Layout for English, Math, Physics */}
              <div
                className="subjects-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: "20px",
                  padding: "0 24px",
                  maxWidth: "1400px",
                  margin: "24px auto"
                }}
              >
                {allSubjects.map((subject) => (
                  <div
                    key={subject.id}
                    className="subject-card group relative w-full h-full flex flex-col"
                    style={{
                      background: "rgba(255, 255, 255, 0.03)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(139, 195, 74, 0.2)",
                      borderRadius: "16px",
                      padding: "24px",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      minHeight: "350px",
                      animation: `slideInUp 0.6s ease-out ${0.1 + index * 0.1}s both`,
                      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-6px)";
                      e.currentTarget.style.boxShadow =
                        "0 20px 40px rgba(0, 0, 0, 0.3), 0 8px 16px rgba(0, 0, 0, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(139, 195, 74, 0.4)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)";
                      e.currentTarget.style.borderColor =
                        "rgba(139, 195, 74, 0.2)";
                    }}
                  >
                    {/* Subject Header - Enhanced */}
                    <div style={{ marginBottom: "20px" }}>
                      <div className="flex items-start justify-between" style={{ marginBottom: "12px" }}>
                        <div className="flex-1">
                          <h3 style={{
                            color: "#C5E1A5",
                            fontSize: "24px",
                            fontWeight: "700",
                            marginBottom: "8px",
                            lineHeight: "1.2"
                          }}>
                            {subject.name.split("(")[0].trim()}
                          </h3>
                          <p style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "13px",
                            fontWeight: "400",
                            marginBottom: "0"
                          }}>
                            {subject.name.match(/\(([^)]+)\)/)?.[1] || ""}
                          </p>
                        </div>
                        <div style={{
                          background: "rgba(139, 195, 74, 0.15)",
                          border: "1px solid rgba(139, 195, 74, 0.3)",
                          padding: "6px 12px",
                          borderRadius: "16px",
                          textAlign: "center",
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#A5D6A7"
                        }}>
                          {subject.topics.length} {subject.topics.length === 1 ? 'Topic' : 'Topics'}
                        </div>
                      </div>
                      <div style={{
                        height: "1px",
                        background: "rgba(255, 255, 255, 0.1)",
                        margin: "16px 0"
                      }} />
                    </div>

                    {/* Topics List */}
                    <div className="space-y-4 flex-1">
                      {subject.topics.map((topic) => {
                        const topicData = getTopicData(subject.id, topic.id);
                        const colors = getExpertiseColors(
                          topicData.expertiseLevel
                        );
                        console.log(
                          `Topic: ${topic.name}, Level: ${topicData.expertiseLevel}, Color: ${colors.text}`
                        );

                        return (
                          <div
                            key={topic.id}
                            className="topic-item relative"
                            style={{
                              padding: "20px 0",
                              borderBottom: subject.topics.indexOf(topic) === subject.topics.length - 1 ? "none" : "1px solid rgba(255, 255, 255, 0.06)",
                              transition: "all 0.2s ease",
                            }}
                          >
                            <div className="flex items-start justify-between" style={{ marginBottom: "16px" }}>
                              <h4 style={{
                                fontSize: "17px",
                                fontWeight: "600",
                                color: "#C5E1A5",
                                flex: 1,
                                lineHeight: "1.4",
                                paddingRight: "16px"
                              }}>
                                {topic.name}
                              </h4>
                              <span
                                className="status-badge"
                                style={{
                                  padding: "4px 10px",
                                  fontSize: "11px",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px",
                                  borderRadius: "6px",
                                  fontWeight: "600",
                                  backgroundColor: colors.bg,
                                  color: colors.text,
                                  border: `1px solid ${colors.border}`,
                                  whiteSpace: "nowrap",
                                  marginLeft: "12px"
                                }}
                              >
                                {topicData.expertiseLevel}
                              </span>
                            </div>

                            {topicData.lastStudied && (
                              <div className="text-xs mb-3" style={{
                                color: "rgba(255, 255, 255, 0.5)"
                              }}>
                                Last studied: {new Date(topicData.lastStudied.seconds * 1000).toLocaleDateString()}
                              </div>
                            )}

                            {/* Action Button */}
                            <button
                              onClick={() => handleStartStudying(subject.id, topic.id)}
                              className="topic-action-button"
                              style={{
                                width: "100%",
                                marginTop: "16px",
                                padding: "12px 24px",
                                fontSize: "15px",
                                fontWeight: "600",
                                background: "linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)",
                                color: "white",
                                border: "none",
                                borderRadius: "10px",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "8px",
                                boxShadow: "0 2px 8px rgba(76, 175, 80, 0.3)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#9CCC65";
                                e.currentTarget.style.transform = "translateX(2px)";
                                e.currentTarget.style.boxShadow = "0 4px 12px rgba(76, 175, 80, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "linear-gradient(135deg, #66BB6A 0%, #4CAF50 100%)";
                                e.currentTarget.style.transform = "translateX(0)";
                                e.currentTarget.style.boxShadow = "0 2px 8px rgba(76, 175, 80, 0.3)";
                              }}
                            >
                              <span>{topicData.isEvaluated ? "📚 Continue" : "🚀 Begin"}</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action for New Users - REDESIGNED */}
              {Object.values(evaluatedTopics).every((subject) =>
                Object.values(subject || {}).every(
                  (topic) => !topic.isEvaluated
                )
              ) && (
                <div className="cta-section" style={{
                  border: "2px solid rgba(139, 195, 74, 0.25)",
                  borderRadius: "24px",
                  background: "rgba(139, 195, 74, 0.04)",
                  maxWidth: "1000px",
                  margin: "80px auto 0",
                  padding: "60px 48px",
                  textAlign: "center",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)"
                }}>
                  {/* Gradient Overlay */}
                  <div style={{
                    content: '',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: "radial-gradient(circle at center, rgba(139, 195, 74, 0.08) 0%, transparent 70%)",
                    pointerEvents: 'none',
                    zIndex: 0
                  }} />

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="cta-icon" style={{
                      fontSize: "56px",
                      marginBottom: "24px",
                      display: "inline-block",
                      filter: "drop-shadow(0 0 24px rgba(139, 195, 74, 0.4))",
                      animation: "float 3s ease-in-out infinite"
                    }}>🌱</div>

                    <h3 style={{
                      fontSize: "36px",
                      fontWeight: "700",
                      marginBottom: "20px",
                      background: "linear-gradient(135deg, #A5D6A7 0%, #66BB6A 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                      letterSpacing: "-0.5px"
                    }}>
                      Start Your Learning Adventure!
                    </h3>

                    <p style={{
                      fontSize: "17px",
                      color: "rgba(255, 255, 255, 0.75)",
                      lineHeight: "1.7",
                      maxWidth: "750px",
                      margin: "0 auto 36px"
                    }}>
                      Take our comprehensive evaluation quiz to discover your
                      current expertise levels and receive personalized study
                      recommendations.
                    </p>

                    <button
                      onClick={() => navigate("/quiz")}
                      className="cta-button"
                      style={{
                        padding: "18px 56px",
                        fontSize: "18px",
                        fontWeight: "600",
                        background: "linear-gradient(135deg, #66BB6A 0%, #8BC34A 100%)",
                        color: "#1B3624",
                        border: "none",
                        borderRadius: "14px",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "12px",
                        boxShadow: "0 6px 24px rgba(139, 195, 74, 0.35)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-3px)";
                        e.currentTarget.style.boxShadow = "0 8px 32px rgba(139, 195, 74, 0.45)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 6px 24px rgba(139, 195, 74, 0.35)";
                      }}
                    >
                      🎯 Start Evaluation Quiz
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
