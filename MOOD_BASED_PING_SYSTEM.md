# Mood-Based Ping Matching System

## Overview

The app now features a sophisticated mood-based ping matching system that integrates user mood status with the existing ping notification algorithm. Your mood status directly affects:
- **Search radius** - How far pings will reach you
- **Notification priority** - How eagerly you receive notifications
- **Match requirements** - How closely pings must match your interests

## How It Works

### Mood Categories

Moods are organized into 4 categories, each with different behaviors:

#### 🟢 SEEKING (High Priority)
**Behavior**: Cast wider net, receive more opportunities
- **Radius Multiplier**: 1.3x - 2.0x (search further)
- **Notification Weight**: 8-10/10 (high priority)
- **Interest Matching**: Not required (all pings welcome)
- **Notification Style**: Enthusiastic ("Perfect match!")

**Moods**:
- Available (1.5x radius)
- Looking for Company (2.0x radius - widest!)
- Free to Chat (1.5x radius)
- Down to Chat (1.5x radius)
- Group Activities (1.8x radius)
- Food & Drinks? (1.5x radius)
- Sharing Stories (1.3x radius)
- Networking (1.5x radius, requires 1+ interest match)

**Best For**: When you're actively looking to connect and want maximum opportunities

---

#### 🟡 NEUTRAL (Balanced)
**Behavior**: Normal radius, moderate requirements
- **Radius Multiplier**: 0.8x - 1.2x (standard range)
- **Notification Weight**: 4-6/10 (medium priority)
- **Interest Matching**: Required (1-2 matching interests)
- **Notification Style**: Standard ("New ping event")

**Moods**:
- Exploring (1.0x radius, requires 1 match)
- Sightseeing (1.0x radius, requires 1 match)
- Airport Tour (0.8x radius - closer to airport)
- Language Exchange (1.2x radius, requires 2 matches)
- Restaurant Hunting (1.0x radius, requires 1 match)
- Remote Work (1.0x radius, requires 2 matches)
- Food Tour (1.2x radius, requires 1 match)

**Best For**: When you're open to activities but want them to align with your interests

---

#### 🟠 SELECTIVE (High Requirements)
**Behavior**: Smaller radius, only nearby high-quality matches
- **Radius Multiplier**: 0.3x - 0.9x (very close only)
- **Notification Weight**: 2-5/10 (lower priority)
- **Interest Matching**: Required (2-4 matching interests)
- **Notification Style**: Casual, silent notifications

**Moods**:
- Coffee Break (0.7x radius, requires 2 matches)
- Away (0.5x radius, requires 3 matches)
- Snack Time (0.7x radius, requires 2 matches)
- Local Cuisine (0.9x radius, requires 2 matches)
- Duty Free (0.5x radius, requires 3 matches)
- Lounge Access (0.5x radius, requires 3 matches)
- Gate Change (0.3x radius - emergency mode, requires 4 matches)

**Best For**: When you're busy but might be interested in something perfect nearby

---

#### 🔴 UNAVAILABLE (No Notifications)
**Behavior**: Complete blocking of ping notifications
- **Radius Multiplier**: 0x (no search)
- **Notification Weight**: 0/10 (excluded)
- **Interest Matching**: N/A (always filtered out)
- **Notification Style**: None

**Moods**:
- Busy
- Do Not Disturb
- Work Mode
- In a Meeting
- Conference Call
- Project Deadline
- Business Trip

**Best For**: When you absolutely don't want to be disturbed

---

## Matching Algorithm

When a ping is created, the system:

1. **Gets base radius** from ping settings (e.g., 10 miles)
2. **For each user**:
   - Gets their mood profile
   - Calculates adjusted radius: `base × radiusMultiplier`
   - Checks if user is within their adjusted radius
   - Validates interest matching requirements
   - Skips if mood category is "unavailable"
3. **Sorts matches** by notification weight (most eager users first)
4. **Sends notifications** with mood-aware messaging

### Example Scenarios

#### Scenario 1: Coffee Ping (5 miles radius)
- **User A** (Looking for Company): Sees ping up to 10 miles (5 × 2.0)
- **User B** (Exploring): Sees ping up to 5 miles (5 × 1.0)
- **User C** (Coffee Break): Sees ping up to 3.5 miles (5 × 0.7)
- **User D** (Busy): Doesn't see ping at all

#### Scenario 2: User 7 miles away from you
- If you're **Available** (1.5x) with 10-mile base → You see pings up to 15 miles
- If you're **Away** (0.5x) with 10-mile base → You only see pings up to 5 miles
- So the user 7 miles away would notify you when Available, but not when Away

---

## Notification Differences by Mood

### Seeking Mood
```
Title: 🎯 Coffee Meetup - 2.3 miles away
Body: Perfect match! John: Anyone want to grab coffee at Starbucks?
Sound: Default
Priority: High
```

### Neutral Mood
```
Title: 🎯 Coffee Meetup - 2.3 miles away
Body: John: Anyone want to grab coffee at Starbucks?
Sound: Default
Priority: High
```

### Selective Mood
```
Title: 🎯 Coffee Meetup - 2.3 miles away
Body: John invited you to a Food & Drinks activity nearby.
Sound: None (silent)
Priority: Normal
```

---

## Implementation Details

### Key Files Modified

1. **`src/hooks/usePings.ts`**
   - Added `MoodProfile` interface and `moodProfiles` definition
   - Rewrote `findMatchingUsers()` to use dynamic radius
   - Updated `createPing()` to send mood-aware notifications
   - Added helper functions: `getMoodProfile()`, `calculateInterestMatches()`

2. **`src/components/StatusSheet.tsx`**
   - Added info box explaining mood impact
   - Existing mood options now have functional purpose

### Data Structure

```typescript
interface MoodProfile {
  category: 'seeking' | 'neutral' | 'selective' | 'unavailable';
  radiusMultiplier: number;      // 0-2.0
  notificationWeight: number;    // 0-10
  requireInterestMatch: boolean; // true/false
  minMatchThreshold: number;     // 0-5
  description: string;
}
```

### Notification Data
Notifications now include:
```typescript
{
  yourMoodCategory: 'seeking',
  notificationWeight: 9,
  moodDescription: 'Eager to connect'
}
```

---

## User Benefits

1. **Control Over Notifications**: Users can fine-tune their ping exposure without turning notifications completely off
2. **Context-Aware Matching**: "Coffee Break" users get coffee pings, "Busy" users get nothing
3. **Prevents Spam**: Selective moods filter out low-quality matches automatically
4. **Encourages Serendipity**: Seeking moods expand opportunities beyond normal radius
5. **Respectful of Boundaries**: Unavailable moods completely block notifications

---

## Testing the System

To test the mood-based matching:

1. **Set your mood** to "Looking for Company" (seeking)
2. **Create a test ping** with 10-mile radius
3. **Check console logs** - should show:
   - Mood profiles being loaded
   - Adjusted radius calculations (20 miles for seeking)
   - Users sorted by eagerness
4. **Change mood** to "Busy" (unavailable)
5. **Create another ping** - you should not appear in matches

### Console Output Example
```
=== MOOD-BASED PING MATCHING STARTED ===
Base radius: 10 miles
Ping category: Food & Drinks

--- Checking user: Jane ---
Mood: Looking for Company (seeking)
Radius multiplier: 2.0x
Notification weight: 10/10
✅ Available according to schedule
Adjusted radius: 20.0 miles
✅ Within radius: 8.3 miles
Interest match score: 3
✅ MATCH! Adding to notification queue

=== MATCHING SUMMARY ===
Total users checked: 15
Final matches: 8
```

---

## Future Enhancements

Potential improvements:
1. **Time-based auto-switching**: Auto-change to "Work Mode" during work hours
2. **Location-aware moods**: Auto-suggest "Airport Tour" when at airport
3. **Smart suggestions**: "You've been 'Busy' for 6 hours, want to take a break?"
4. **Mood analytics**: Show users their mood patterns over time
5. **Custom mood creation**: Let users define their own mood profiles

---

## Technical Notes

- Mood profiles are defined in `src/hooks/usePings.ts` (lines 59-300)
- Default mood (no status set) uses neutral profile (1.0x radius, requires 1 interest match)
- Friends-only pings still work with mood-based radius adjustments
- System is backward compatible - old pings without mood data still work
- Extensive logging helps debug matching issues

---

**Last Updated**: October 21, 2025
**Version**: 1.0
**Implementation**: Option 3 - Dynamic Mood Categories with Smart Filtering

