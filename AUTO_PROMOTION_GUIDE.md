# Auto-Promotion System - How Students Level Up

## Overview
Students are now **automatically promoted** to higher expertise levels based on sustained performance during study sessions. No need to retake eval quizzes!

## Promotion Criteria

### Beginner → Apprentice 🌱
- **Minimum Accuracy**: 75% average across sessions
- **Minimum Sessions**: 2 sessions completed
- **Performance Trend**: Improving or Stable (not declining)

**Example:**
```
Session 1: 70% accuracy (beginner)
Session 2: 80% accuracy (beginner)
→ Average: 75% ✅ Sessions: 2 ✅ Trend: improving ✅
→ 🎉 PROMOTED TO APPRENTICE!
```

### Apprentice → Pro 🌿
- **Minimum Accuracy**: 80% average across sessions
- **Minimum Sessions**: 3 sessions completed at apprentice level
- **Performance Trend**: Improving or Stable

**Example:**
```
Session 1 (apprentice): 78% accuracy
Session 2 (apprentice): 82% accuracy
Session 3 (apprentice): 81% accuracy
→ Average: 80.3% ✅ Sessions: 3 ✅ Trend: stable ✅
→ 🎉 PROMOTED TO PRO!
```

### Pro → Grand Master 🌳
- **Minimum Accuracy**: 90% average across sessions
- **Minimum Sessions**: 4 sessions completed at pro level
- **Performance Trend**: Improving or Stable

**Example:**
```
Session 1-4 (pro): 88%, 91%, 92%, 91%
→ Average: 90.5% ✅ Sessions: 4 ✅ Trend: improving ✅
→ 🎉 PROMOTED TO GRAND MASTER!
```

### Grand Master 🏆
- **Already at maximum level** - No further promotion
- Continue practicing to maintain mastery

## How It Works

### 1. Performance Tracking
Every study session tracks:
- Questions answered
- Correct answers
- **Accuracy** (correct / total)

### 2. Running Average Calculation
```javascript
newAverage = (previousAverage × previousSessions + currentAccuracy) / totalSessions
```

**Example:**
```
After Session 1: 70% accuracy → Average: 70%
After Session 2: 80% accuracy → Average: (70×1 + 80×1) / 2 = 75%
After Session 3: 85% accuracy → Average: (75×2 + 85×1) / 3 = 78.3%
```

### 3. Trend Analysis
Compares current session to previous average:
- **Improving**: +15% or more above previous average
- **Declining**: -15% or more below previous average
- **Stable**: Within ±15% of previous average

### 4. Promotion Check
After **every session end**, the system:
1. Calculates average accuracy
2. Determines performance trend
3. Checks promotion criteria
4. Promotes if all criteria met
5. Shows celebration message

## Promotion Flow

```
┌─────────────────────────────────────┐
│     Complete Study Session          │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Calculate Performance Metrics      │
│  - Current accuracy: 82%            │
│  - Average accuracy: 76%            │
│  - Total sessions: 2                │
│  - Trend: improving                 │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Check Promotion Criteria           │
│  Current level: Beginner            │
│  ✅ Accuracy ≥ 75%                  │
│  ✅ Sessions ≥ 2                    │
│  ✅ Trend: improving/stable         │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  🎉 PROMOTE!                        │
│  Beginner → Apprentice              │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Update Topic Progress              │
│  expertiseLevel: 'apprentice'       │
│  Show celebration message           │
└─────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│  Next Session Uses New Level        │
│  - More challenging content         │
│  - Adjusted learning/practice ratio │
│  - Different primary agent          │
└─────────────────────────────────────┘
```

## What Changes After Promotion?

### Learning Ratios Adjust

| Level | Learning % | Practice % | Primary Agent |
|-------|-----------|-----------|---------------|
| **Beginner** | 80% | 20% | Tutor (supportive) |
| **Apprentice** | 60% | 40% | Teacher (structured) |
| **Pro** | 40% | 60% | Teacher (practice) |
| **Grand Master** | 20% | 80% | Perfect Scorer (mastery) |

### Session Strategy Changes

**As Beginner:**
- Strategy: "Foundation Building"
- Focus: Understanding core concepts
- Lots of explanations and guidance

**After Promotion to Apprentice:**
- Strategy: "Concept Application"
- Focus: Applying knowledge to problems
- Balanced learning and practice

**After Promotion to Pro:**
- Strategy: "Skill Refinement"
- Focus: Mastering exam techniques
- Mostly practice questions

**After Promotion to Grand Master:**
- Strategy: "Mastery Validation"
- Focus: Perfecting performance
- Almost all challenging practice

## Celebration Messages

When promoted, students see:
```
🎉 Congratulations! You've been promoted from beginner to apprentice!
```

This appears in the chat at the end of the session that triggered the promotion.

## Edge Cases Handled

### 1. Declining Performance
```
Session 1: 80% accuracy (apprentice)
Session 2: 60% accuracy (apprentice)
→ Trend: declining ❌
→ NO PROMOTION (even if average is still high)
```

**Reason**: Requires sustained/improving performance, not just one-time success

### 2. Not Enough Sessions
```
Session 1: 95% accuracy (beginner)
→ Average: 95% ✅ Sessions: 1 ❌
→ NO PROMOTION (need minimum 2 sessions)
```

**Reason**: One good session doesn't prove mastery

### 3. High Accuracy, Too Few Sessions at New Level
```
Just promoted to Apprentice
Session 1 (apprentice): 85% accuracy
→ Average: 85% ✅ Sessions: 1 ❌ (need 3 for pro)
→ NO PROMOTION (need more practice at current level)
```

**Reason**: Each level requires sustained performance

### 4. Eval Quiz Override
If student completes eval quiz **after** study sessions:
```
Study sessions set level to: Apprentice
Eval quiz determines: Pro
→ Final level: Pro (eval quiz takes precedence)
```

**Reason**: `sessionData.context.expertise_level` overrides auto-promotion

## Implementation Details

**File**: `/nurture-app/src/firebase/topicProgress.js`

**Function**: `determineExpertisePromotion()`

**Called**: After every study session in `updateTopicProgress()`

**Logged**: Check browser console for promotion messages:
```
🎉 Promoting from beginner to apprentice! (Accuracy: 76%, Sessions: 2, Trend: improving)
```

## Benefits

### For Students:
- ✅ **No need to retake eval quizzes** to level up
- ✅ **Natural progression** based on actual performance
- ✅ **Immediate feedback** on improvement
- ✅ **Motivating** to see progress

### For Learning:
- ✅ **Content adapts** to demonstrated ability
- ✅ **Prevents boredom** (challenges increase)
- ✅ **Prevents frustration** (requires sustained success)
- ✅ **Tracks real mastery** (not just one-time performance)

## Testing Scenarios

### Test 1: Beginner → Apprentice
```bash
1. Start as beginner (no eval quiz)
2. Complete session with 78% accuracy
3. Complete session with 80% accuracy
4. Check: Should be promoted to apprentice
5. Start new session: Should see apprentice-level content
```

### Test 2: No Promotion (Declining)
```bash
1. Start as apprentice
2. Complete session with 85% accuracy
3. Complete session with 65% accuracy
4. Check: Should NOT be promoted (declining trend)
```

### Test 3: Grand Master Stay
```bash
1. Already at grand master
2. Complete sessions with 95% accuracy
3. Check: Stays at grand master (max level)
```

## Future Enhancements (Optional)

### 1. Demotion for Declining Performance
```javascript
// If accuracy drops significantly and consistently
if (trend === 'declining' && averageAccuracy < 0.5) {
  demote to previous level
}
```

### 2. Promotion Notifications
```javascript
// Send push notification or email
sendPromotionNotification(userId, {
  from: 'beginner',
  to: 'apprentice',
  topic: topicId
});
```

### 3. Achievement Badges
```javascript
// Award badges for promotions
awardBadge(userId, 'apprentice_unlocked', topicId);
```

### 4. Progress Visualization
```javascript
// Show progress bar in dashboard
progressToNextLevel = {
  currentAccuracy: 76%,
  requiredAccuracy: 80%,
  currentSessions: 2,
  requiredSessions: 3,
  percentComplete: 66%
}
```

## Conclusion

The auto-promotion system ensures students:
1. Are **challenged appropriately** based on demonstrated ability
2. Don't need to **manually retake tests** to level up
3. Get **immediate recognition** for improvement
4. Experience **natural progression** in learning difficulty

The system is **conservative** (requires sustained performance) to ensure promotions represent genuine mastery, not lucky streaks!
