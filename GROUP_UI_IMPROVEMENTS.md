# Group UI Improvements & Event Proposals Feature

## Overview
Comprehensive improvements to the group profile UI with added event proposal functionality and settings management.

## ✨ What's New

### 1. **Event Proposals System**
Members can now propose events (like "bar tonight?") with voting and discussion:

#### Features:
- **Create Proposals**: Title, description, location, date/time
- **Voting System**: Yes (👍), Maybe (❓), No (👎)
- **Discussion**: Text comments + photo sharing
- **Status Management**: Active → Confirmed/Cancelled
- **Real-time Updates**: Live vote counts and comments

#### User Flow:
```
1. Member creates proposal: "Bar tonight? 🍻"
   - Location: "Downtown Pub"
   - Time: 8:00 PM
   
2. Members vote:
   - 5 Yes 👍
   - 2 Maybe ❓
   - 1 No 👎
   
3. Discussion:
   - "I'm in! Can we do 8:30?"
   - [Photo of bar menu]
   - "See you there!"
   
4. Organizer confirms → Status: CONFIRMED ✓
```

### 2. **Improved Tab Navigation**

#### All Tabs:
1. **Feed** - Posts and Event Proposals (toggle between them)
2. **About** - Group info, category, location, rules, tags
3. **Members** - Full member list with roles
4. **Requests** - Join requests (organizers only)
5. **Settings** - Group management (organizers only)

#### Mobile Optimization:
- **Horizontal scrolling** tabs for better UX on small screens
- **Responsive design** - tabs adapt to content
- **Clear indicators** - active tab highlighted with underline
- **Badge notifications** - request count shown on Requests tab

### 3. **Settings Tab** (Organizers Only)

#### Group Management:
- ✏️ **Edit Group Details** (coming soon)
- 🔒 **Privacy Settings** - Shows current status (Public/Private)
- 👥 **Manage Organizers** (coming soon)

#### Danger Zone (Creator Only):
- 🗑️ **Delete Group** - Permanent deletion with confirmation

### 4. **Feed Toggle**

Clean, intuitive toggle within the Feed tab:

```
┌─────────────────────────────────┐
│  Feed Tab                       │
├─────────────────────────────────┤
│  [Posts] [Event Proposals]      │ ← Toggle
├─────────────────────────────────┤
│                                 │
│  Content based on selection     │
│                                 │
└─────────────────────────────────┘
```

- **Posts**: Traditional group posts with text/images
- **Event Proposals**: Voting-based event coordination

## 🎨 UI/UX Improvements

### Clean Design:
- **Consistent styling** across all tabs
- **Smooth animations** for tab switching
- **Color-coded statuses** for proposals (Active/Confirmed/Cancelled)
- **Empty states** with helpful messages
- **Pull-to-refresh** on all views

### Accessibility:
- **Clear icons** for all tabs
- **High contrast** text and buttons
- **Touch targets** properly sized (44px minimum)
- **Status badges** with both color and text

### Performance:
- **Lazy loading** for tab content
- **Optimized re-renders**
- **Cached data** where appropriate

## 📱 Component Structure

### New Components:
```
src/components/group/
├── CreateProposalModal.tsx     - Modal for creating proposals
├── ProposalItem.tsx             - Individual proposal display
├── ProposalComments.tsx         - Comments section with photos
├── ProposalsFeed.tsx            - Feed container for proposals
└── (existing components)
```

### Updated Components:
```
src/app/group/
├── [id].tsx                     - Main group profile (updated)
└── (existing files)
```

### New Types:
```typescript
// src/types/groupTypes.ts
- GroupEventProposal
- ProposalComment
- VoteType ('yes' | 'no' | 'maybe')
```

## 🔧 Technical Details

### Database Structure:
```
groups/{groupId}/
├── (group data)
└── eventProposals/{proposalId}
    ├── title, description, location, date, time
    ├── votes: { yes: [], no: [], maybe: [] }
    ├── yesCount, noCount, maybeCount
    ├── status: 'active' | 'confirmed' | 'cancelled' | 'expired'
    └── comments/{commentId}
        ├── content, authorId, authorName
        └── imageUrl (optional)
```

### Hooks Used:
- `useGroups()` - Extended with 7 new proposal functions
- `useAuth()` - User authentication
- `ThemeContext` - Dark/light mode support

### New Functions in useGroups:
1. `createProposal()` - Create new proposal
2. `voteOnProposal()` - Vote yes/maybe/no
3. `getProposals()` - Fetch all proposals
4. `addProposalComment()` - Add comment with optional photo
5. `getProposalComments()` - Fetch all comments
6. `updateProposalStatus()` - Change status
7. `deleteProposal()` - Remove proposal

## 🚀 Usage Examples

### Creating a Proposal:
```typescript
await createProposal(
  groupId,
  "Bar tonight?",
  "Let's meet at the downtown pub",
  "Downtown Pub",
  new Date(),  // date
  new Date(),  // time
  userId,
  userName
);
```

### Voting:
```typescript
await voteOnProposal(groupId, proposalId, userId, 'yes');
```

### Adding Comment with Photo:
```typescript
await addProposalComment(
  groupId,
  proposalId,
  "Looks great! I'm in!",
  userId,
  userName,
  userProfilePic,
  photoUrl  // optional
);
```

## 📊 Permissions

### All Members:
- ✅ View proposals
- ✅ Vote on proposals
- ✅ Comment on proposals
- ✅ Create proposals
- ✅ Delete own proposals

### Organizers:
- ✅ All member permissions
- ✅ Delete any proposal
- ✅ Change proposal status
- ✅ Access settings tab
- ✅ Manage join requests

### Creator:
- ✅ All organizer permissions
- ✅ Delete group
- ✅ Manage privacy settings

## 🎯 Key Features

1. **Intuitive Navigation** - Easy tab switching with visual feedback
2. **Flexible Event Planning** - Quick, informal event coordination
3. **Visual Voting** - See who's interested at a glance
4. **Rich Discussion** - Photos and text in comments
5. **Status Tracking** - Clear proposal lifecycle
6. **Mobile-First** - Optimized for touch interfaces
7. **Theme Support** - Works in light and dark modes
8. **Settings Access** - Easy group management for organizers

## 🔮 Future Enhancements (Coming Soon)

- Edit group details functionality
- Advanced privacy controls
- Role management UI
- Proposal notifications
- Calendar integration
- Export proposals to events
- Recurring proposals
- Proposal templates

## 💡 Best Practices

### For Members:
- Keep proposal titles short and clear
- Include time and location details
- Vote honestly to help planning
- Use photos to share venue details

### For Organizers:
- Review proposals regularly
- Confirm decisions promptly
- Update group settings as needed
- Monitor member activity

## 🐛 Notes

- All tabs maintain their original functionality
- Feed toggle is visible only to members
- Settings visible only to organizers
- Request tab shows badge with pending count
- Tabs scroll horizontally on small screens
- Creator has exclusive delete group access

---

*Last Updated: Implementation Complete*

