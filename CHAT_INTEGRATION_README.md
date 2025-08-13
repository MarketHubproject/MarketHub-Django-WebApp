# Stream Chat Integration with FAQ Support

This document provides a comprehensive guide for implementing in-app chat support with Stream Chat, including FAQ integration, pre-chat bot functionality, and escalation to human agents.

## 🚀 Features Implemented

### ✅ Floating Chat Button
- **Accessible floating action button** on every screen
- **Unread message badge** with count display
- **Pulse animation** for new messages
- **Customizable positioning** (bottom-right/bottom-left)
- **Full accessibility support** with VoiceOver/TalkBack

### ✅ Pre-Chat Bot & FAQ Integration
- **Intelligent FAQ search** with relevance scoring
- **Categorized help articles** (General, Orders, Payments, etc.)
- **Popular and suggested articles**
- **Article feedback system** (helpful/not helpful)
- **Multi-language support** (English & Chinese)
- **Bot suggestions** based on user queries

### ✅ Stream Chat Integration
- **Real-time messaging** with Stream Chat SDK
- **User authentication** and token management
- **Channel persistence** across sessions
- **Agent escalation** with seamless handoff
- **Message delivery status** and typing indicators
- **Offline support** with connection retry

### ✅ Accessibility & Localization
- **WCAG compliance** with proper accessibility labels
- **Screen reader support** with announcements
- **Keyboard navigation** support
- **Dynamic text sizing** support
- **RTL language support** ready
- **Full i18n integration** with existing system

## 📁 Project Structure

```
src/
├── components/chat/
│   ├── FloatingChat.tsx           # Main chat component
│   ├── FloatingChatButton.tsx     # Floating action button
│   └── index.ts                   # Component exports
├── contexts/
│   └── ChatContext.tsx            # Stream Chat state management
├── screens/
│   └── ChatSupportScreen.tsx      # Main support screen
├── services/
│   ├── streamChatService.ts       # Stream Chat API wrapper
│   └── faqService.ts              # FAQ management service
└── i18n/
    ├── en.json                    # English translations
    └── zh.json                    # Chinese translations
```

## 🔧 Setup Instructions

### 1. Install Dependencies

The following packages have been added to `package.json`:
```bash
npm install stream-chat-react-native stream-chat-react-native-core react-native-svg react-native-reanimated
```

### 2. Environment Configuration

Create a `.env` file based on `.env.example`:
```bash
# Stream Chat Configuration
STREAM_CHAT_API_KEY=your-stream-chat-api-key-here
SUPPORT_EMAIL=support@markethub.com

# Chat Configuration
CHAT_BOT_USER_ID=markethub-bot
CHAT_BOT_NAME=MarketHub Assistant

# Feature Flags
ENABLE_CHAT_SUPPORT=true
ENABLE_FAQ_SEARCH=true
ENABLE_LIVE_CHAT=true
```

### 3. Stream Chat Setup

1. **Create Stream Chat Account**: Sign up at [getstream.io](https://getstream.io)
2. **Create App**: Set up a new chat application
3. **Get API Key**: Copy your API key to the environment file
4. **Configure Backend**: Set up token generation endpoint

### 4. Backend Integration

Your backend needs to provide Stream Chat tokens for authenticated users:

```javascript
// Example Node.js endpoint
const StreamChat = require('stream-chat').StreamChat;

app.post('/auth/stream-token', authenticateUser, async (req, res) => {
  const serverClient = StreamChat.getInstance(API_KEY, API_SECRET);
  
  const token = serverClient.createToken(req.user.id);
  
  res.json({
    token,
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: 'user'
    }
  });
});
```

## 💻 Usage

### Basic Implementation

The chat system is automatically available throughout the app:

```tsx
// App.tsx - Already integrated
function AppContent(): React.JSX.Element {
  const isAuthenticated = useIsAuthenticated();

  return (
    <ChatProvider>
      <View style={{ flex: 1 }}>
        <AppNavigator isAuthenticated={isAuthenticated} />
        {/* Floating Chat available on every screen */}
        <FloatingChat isVisible={true} showInModal={true} />
      </View>
    </ChatProvider>
  );
}
```

### Manual Chat Integration

For specific screens that need custom chat behavior:

```tsx
import { FloatingChat, FloatingChatButton } from '../components/chat';
import { useChat, useChatUnreadCount } from '../contexts/ChatContext';

function CustomScreen() {
  const { createSupportChannel } = useChat();
  const unreadCount = useChatUnreadCount();

  const handleSupportRequest = async () => {
    await createSupportChannel();
  };

  return (
    <View>
      {/* Your screen content */}
      <FloatingChatButton 
        onPress={handleSupportRequest}
        unreadCount={unreadCount}
      />
    </View>
  );
}
```

### Chat Context Usage

Access chat functionality anywhere in the app:

```tsx
import { useChat } from '../contexts/ChatContext';

function AnyComponent() {
  const {
    client,
    currentUser,
    isConnected,
    supportChannel,
    initializeChat,
    createSupportChannel,
    markChannelAsRead,
  } = useChat();

  // Initialize chat for authenticated user
  useEffect(() => {
    if (user && !isConnected) {
      initializeChat(user, token);
    }
  }, [user, isConnected]);
}
```

## 🎨 Customization

### Theme Integration

The chat components use the existing theme system:

```tsx
// src/theme/index.ts
export const theme = {
  colors: {
    primary: '#6366F1',     // Chat button color
    success: '#10B981',     // Helpful feedback
    error: '#EF4444',       // Error states
    // ... other colors
  }
};
```

### Localization

Add new chat translations to your i18n files:

```json
// i18n/en.json
{
  "chat": {
    "support": "Support",
    "helpCenter": "Help Center",
    "liveChat": "Live Chat",
    "startChat": "Start Chat",
    // ... more translations
  },
  "faq": {
    "categories": {
      "general": "General",
      "orders": "Orders",
      // ... categories
    }
  }
}
```

### FAQ Content Management

Extend the FAQ service with your content:

```tsx
// src/services/faqService.ts
const articles: FAQArticle[] = [
  {
    id: 'custom-article',
    title: 'Custom Help Article',
    content: 'Your help content here...',
    category: 'general',
    keywords: ['help', 'support', 'custom'],
    // ... other properties
  }
];
```

## 🔐 Security Considerations

### Token Management
- **Never store API secrets** in the client app
- **Implement token refresh** logic for long sessions
- **Validate user permissions** on the backend

### User Authentication
- **Verify user identity** before generating tokens
- **Implement rate limiting** for chat operations
- **Sanitize user input** in chat messages

### Data Privacy
- **Encrypt sensitive data** in transit and at rest
- **Implement data retention** policies
- **Comply with GDPR/CCPA** requirements

## 📱 Platform-Specific Setup

### iOS Configuration

Add to `ios/Podfile`:
```ruby
pod 'RNSVG', :path => '../node_modules/react-native-svg'
pod 'RNReanimated', :path => '../node_modules/react-native-reanimated'
```

Run:
```bash
cd ios && pod install
```

### Android Configuration

Ensure `android/app/build.gradle` includes:
```gradle
implementation project(':react-native-svg')
implementation project(':react-native-reanimated')
```

## 🧪 Testing

### Unit Tests
```bash
# Test FAQ service
npm test src/services/faqService.test.ts

# Test chat components
npm test src/components/chat/__tests__/
```

### Integration Tests
```bash
# Test chat flow
npm test src/__tests__/chat-integration.test.ts
```

### Accessibility Testing
- **VoiceOver (iOS)**: Test with screen reader enabled
- **TalkBack (Android)**: Verify accessibility announcements
- **Switch Control**: Test keyboard navigation
- **Dynamic Type**: Test with large text sizes

## 📊 Analytics & Monitoring

### Recommended Events to Track
- `chat_support_opened`
- `faq_article_viewed`
- `chat_escalated_to_agent`
- `support_ticket_created`
- `faq_search_performed`

### Error Monitoring
```tsx
// Example Sentry integration
import * as Sentry from '@sentry/react-native';

try {
  await streamChatService.connectUser(user, token);
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      component: 'chat',
      action: 'connect_user'
    }
  });
}
```

## 🚀 Production Deployment

### Pre-Launch Checklist
- [ ] Stream Chat API keys configured
- [ ] Backend token generation endpoint ready
- [ ] FAQ content reviewed and localized
- [ ] Support agent accounts created
- [ ] Accessibility testing completed
- [ ] Performance testing conducted
- [ ] Error monitoring configured
- [ ] Analytics events implemented

### Performance Optimization
- **Lazy load** chat components when needed
- **Implement pagination** for FAQ articles
- **Cache frequently accessed** articles
- **Optimize image assets** for different densities
- **Use React.memo** for expensive components

## 🆘 Troubleshooting

### Common Issues

**Chat not connecting:**
- Verify API key is correct
- Check network connectivity
- Ensure user token is valid

**FAQ search not working:**
- Check search term length (minimum 3 characters)
- Verify article keywords are properly set
- Test search algorithm with different queries

**Accessibility issues:**
- Test with screen readers enabled
- Verify all buttons have accessibility labels
- Check color contrast ratios

### Debug Mode
Enable debug logging:
```tsx
// In development
if (__DEV__) {
  console.log('Chat Debug Mode Enabled');
  // Stream Chat client debug
  StreamChat.getInstance(API_KEY).setLogLevel('info');
}
```

## 📞 Support

For technical support with this integration:
- **Documentation**: Check this README and inline code comments
- **Issues**: Create GitHub issues for bugs or feature requests
- **Stream Chat Support**: Contact Stream for API-specific issues

## 🎯 Future Enhancements

### Planned Features
- **File upload** support in chat
- **Voice message** recording
- **Video call** integration
- **Chat analytics** dashboard
- **Advanced bot** responses with AI
- **Multi-language** bot support
- **Chat history** export
- **Satisfaction surveys** post-chat

### Architecture Improvements
- **React Query** integration for better caching
- **WebSocket** fallback for better reliability
- **Offline message** queuing
- **Push notification** integration
- **Deep linking** to specific chat threads

---

## 📄 License

This chat integration follows the same license as the main MarketHub project.

---

*Last updated: January 2025*
