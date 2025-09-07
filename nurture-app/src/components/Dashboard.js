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
          id: "algebra_solving_linear_quadratic_equations",
          name: "Algebra: Solving linear/quadratic equations (Numerical Answer)",
        },
        {
          id: "algebra_simplifying_expressions",
          name: "Simplifying expressions (Numerical Answer)",
        },
      ],
    },
    {
      id: "english_language",
      name: "English Language (SEAB Syllabus 1128)",
      topics: [
        {
          id: "reading_comprehension",
          name: "Reading Comprehension: Test understanding of a given passage with questions on inference, main idea, and author's purpose (MCQ and Open-ended Questions)",
        },
      ],
    },
  ];

  // Helper function to sanitize names for Firestore paths (same logic as EvaluationQuiz)
  const sanitizeForFirestore = (name) => {
    return name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  };

  useEffect(() => {
    const fetchEvaluatedTopics = async () => {
      console.log("Dashboard: Fetching evaluated topics for user:", user?.uid);
      if (!user) {
        setLoading(false);
        return;
      }

      const db = getFirestore();
      const evaluatedTopicsData = {};

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
                  `Dashboard: ✅ Found subject data at ${subjectName}`
                );
                foundSubjectData = true;

                // Map found topics back to our predefined topics
                topicsSnapshot.forEach((topicDoc) => {
                  const topicData = topicDoc.data();
                  const firebaseTopicId = topicDoc.id;

                  console.log(
                    `Dashboard: Found topic in Firebase: ${firebaseTopicId}`,
                    topicData
                  );

                  // Find matching topic in our predefined topics
                  // This is a flexible matching approach
                  const matchingTopic = subject.topics.find((topic) => {
                    const possibleMatches = [
                      topic.id,
                      sanitizeForFirestore(topic.name),
                      topic.name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
                    ];
                    return (
                      possibleMatches.includes(firebaseTopicId) ||
                      firebaseTopicId.includes(topic.id) ||
                      topic.id.includes(firebaseTopicId)
                    );
                  });

                  if (matchingTopic) {
                    evaluatedTopicsData[subjectKey][matchingTopic.id] = {
                      expertiseLevel:
                        topicData.expertiseLevel || "Not Evaluated",
                      evaluationScore:
                        topicData.evaluationScore || topicData.score || 0,
                      lastStudied:
                        topicData.lastStudied || topicData.lastEvaluated,
                      isEvaluated: true,
                    };
                    console.log(
                      `Dashboard: ✅ Mapped ${firebaseTopicId} to ${matchingTopic.id}:`,
                      evaluatedTopicsData[subjectKey][matchingTopic.id]
                    );
                  } else {
                    // If we can't match, create a best-guess mapping
                    console.log(
                      `Dashboard: ⚠️ Could not match topic ${firebaseTopicId} to predefined topics`
                    );
                    // Use the first topic as fallback if there's only one
                    if (subject.topics.length === 1) {
                      const fallbackTopic = subject.topics[0];
                      evaluatedTopicsData[subjectKey][fallbackTopic.id] = {
                        expertiseLevel:
                          topicData.expertiseLevel || "Not Evaluated",
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

        console.log("Dashboard: Final evaluated topics:", evaluatedTopicsData);
        setEvaluatedTopics(evaluatedTopicsData);
      } catch (error) {
        console.error("Dashboard: Error fetching evaluated topics:", error);
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
      className="min-h-screen"
      style={{
        background: "linear-gradient(135deg, #1E2B22 0%, #0f1419 100%)",
        color: "#F5F5F5",
      }}
    >
      {/* Header Section */}
      <div className="px-8 pt-12 pb-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1
            className="text-5xl font-bold mb-4"
            style={{
              background: "linear-gradient(135deg, #49B85B, #6ee7b7)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Welcome Back, {getFirstName()}! 🌱
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Ready to nurture your knowledge and grow your expertise?
          </p>
        </div>
      </div>

      {/* Main Dashboard Content */}
      <div className="px-4 sm:px-6 lg:px-8 pb-8">
        <div className="max-w-full mx-auto">
          <div className="mb-8">
            <h2 className="text-2xl lg:text-3xl font-bold text-white mb-6">
              Your Learning Journey
            </h2>

            {/* Mastery Level Legend */}
            <div
              className="p-4 rounded-2xl mb-6"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backdropFilter: "blur(10px)",
              }}
            >
              <h3 className="text-lg font-semibold text-white mb-4 text-center">
                Mastery Progression
              </h3>
              <div className="text-center text-base text-white">
                ⚪️ Not Evaluated → 🔴 Beginner → 🟠 Apprentice → 🟢 Pro → 🔵
                Grand Master
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
                className="grid gap-6 mb-8 w-full"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "24px",
                }}
              >
                {allSubjects.map((subject, index) => (
                  <div
                    key={subject.id}
                    className="group relative w-full h-full flex flex-col"
                    style={{
                      background: "rgba(56, 102, 65, 0.2)",
                      backdropFilter: "blur(20px)",
                      border: "1px solid rgba(73, 184, 91, 0.3)",
                      borderRadius: "24px",
                      padding: "24px lg:32px",
                      transition: "all 0.3s ease",
                      minHeight: "400px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-8px)";
                      e.currentTarget.style.boxShadow =
                        "0 20px 40px rgba(73, 184, 91, 0.2)";
                      e.currentTarget.style.borderColor =
                        "rgba(73, 184, 91, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor =
                        "rgba(73, 184, 91, 0.3)";
                    }}
                  >
                    {/* Subject Header */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                            style={{
                              background:
                                "linear-gradient(135deg, #49B85B 0%, #22c55e 100%)",
                              boxShadow: "0 8px 16px rgba(73, 184, 91, 0.3)",
                            }}
                          >
                            {["⚡", "📐", "📚"][index]}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white leading-tight">
                              {subject.name.split("(")[0].trim()}
                            </h3>
                            <p className="text-sm text-gray-400">
                              ({subject.name.match(/\(([^)]+)\)/)?.[1] || ""})
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-400">Topics</div>
                          <div className="text-2xl font-bold text-white">
                            {subject.topics.length}
                          </div>
                        </div>
                      </div>
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
                            className="relative group/topic"
                            style={{
                              background: "rgba(255, 255, 255, 0.05)",
                              border: "2px solid rgba(255, 255, 255, 0.1)",
                              borderRadius: "16px",
                              padding: "20px",
                              transition: "all 0.3s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                "rgba(255, 255, 255, 0.2)";
                              e.currentTarget.style.transform = "scale(1.02)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "rgba(255, 255, 255, 0.1)";
                              e.currentTarget.style.transform = "scale(1)";
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-3">
                                  <h4 className="font-semibold text-white text-sm leading-tight">
                                    {topic.name.length > 80
                                      ? `${topic.name.substring(0, 80)}...`
                                      : topic.name}
                                  </h4>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <span
                                      style={{
                                        padding: "8px 16px",
                                        fontSize: "14px",
                                        backgroundColor: colors.bg,
                                        color: colors.text,
                                        border: `3px solid ${colors.border}`,
                                        borderRadius: "25px",
                                        textShadow:
                                          "0 1px 3px rgba(0, 0, 0, 0.9)",
                                        display: "inline-block",
                                        fontWeight: "bold",
                                        letterSpacing: "0.5px",
                                        boxShadow: `0 0 15px ${colors.dot}40`,
                                        minWidth: "120px",
                                        textAlign: "center",
                                      }}
                                    >
                                      {topicData.expertiseLevel
                                        .charAt(0)
                                        .toUpperCase() +
                                        topicData.expertiseLevel
                                          .slice(1)
                                          .toLowerCase()}
                                    </span>
                                    {topicData.lastStudied && (
                                      <span className="text-xs text-gray-400">
                                        Last studied:{" "}
                                        {new Date(
                                          topicData.lastStudied.seconds * 1000
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={() =>
                                handleStartStudying(subject.id, topic.id)
                              }
                              className="w-full mt-4 px-4 py-3 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center space-x-2"
                              style={{
                                background:
                                  "linear-gradient(135deg, #49B85B 0%, #22c55e 100%)",
                                color: "#1E2B22",
                                boxShadow: "0 4px 12px rgba(73, 184, 91, 0.3)",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-2px)";
                                e.currentTarget.style.boxShadow =
                                  "0 8px 20px rgba(73, 184, 91, 0.4)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 12px rgba(73, 184, 91, 0.3)";
                              }}
                            >
                              <span>
                                {topicData.isEvaluated
                                  ? "📚 Continue Studying"
                                  : "🚀 Begin Studying"}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action for New Users */}
              {Object.values(evaluatedTopics).every((subject) =>
                Object.values(subject || {}).every(
                  (topic) => !topic.isEvaluated
                )
              ) && (
                <div className="text-center py-16">
                  <div
                    className="max-w-2xl mx-auto p-12 rounded-3xl"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(73, 184, 91, 0.1) 0%, rgba(34, 197, 94, 0.05) 100%)",
                      border: "2px dashed rgba(73, 184, 91, 0.3)",
                      backdropFilter: "blur(20px)",
                    }}
                  >
                    <div className="text-6xl mb-6">🌱</div>
                    <h3 className="text-3xl font-bold text-white mb-4">
                      Start Your Learning Adventure!
                    </h3>
                    <p className="text-lg text-gray-300 mb-8">
                      Take our comprehensive evaluation quiz to discover your
                      current expertise levels and receive personalized study
                      recommendations.
                    </p>
                    <button
                      onClick={() => navigate("/quiz")}
                      className="px-10 py-4 font-bold text-lg rounded-2xl transition-all duration-300"
                      style={{
                        background:
                          "linear-gradient(135deg, #49B85B 0%, #22c55e 100%)",
                        color: "#1E2B22",
                        boxShadow: "0 8px 24px rgba(73, 184, 91, 0.4)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform =
                          "translateY(-4px) scale(1.05)";
                        e.currentTarget.style.boxShadow =
                          "0 12px 32px rgba(73, 184, 91, 0.5)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform =
                          "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 24px rgba(73, 184, 91, 0.4)";
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
