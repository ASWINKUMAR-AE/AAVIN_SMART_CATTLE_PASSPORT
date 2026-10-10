import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Typography } from '../../constants/Typography';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextField } from '../../components/ui/TextField';
import { api } from '../../services/api';
import { Ionicons } from '@expo/vector-icons';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isFallback?: boolean;
  provider?: string;
}

export default function AIAssistantScreen() {
  const { user } = useAuth();
  const { colors, isDark } = useTheme();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      sender: 'ai',
      text: user?.preferredLanguage === 'ta'
        ? 'வணக்கம்! நான் உங்கள் ஆவின் பால் பண்ணை AI உதவியாளர். உங்கள் பசுக்களின் பால் உற்பத்தி, தீவனம் மற்றும் சுகாதார பதிவுகள் பற்றி என்னிடம் கேட்கலாம்.'
        : 'Welcome! I am your Aavin Dairy Intelligence Assistant. Ask me about your cattle feeding, milk yield trends, or recorded quality metrics.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (textToSend = inputText) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const res = await api.post('/ai/chat', {
        message: textToSend.trim(),
        language: user?.preferredLanguage || 'en',
      });

      const aiData = res.data?.data;
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiData?.text || 'Record analyzed.',
        isFallback: aiData?.isFallback,
        provider: aiData?.provider,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: 'AI services temporarily unreachable. Your verified dairy records remain safely recorded in phpMyAdmin database.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = user?.preferredLanguage === 'ta'
    ? [
        'பால் கொழுப்பு (FAT) மற்றும் SNF எப்படி அதிகரிப்பது?',
        'Co-4 புல் மற்றும் தாது கலவை அளவு என்ன?',
        'மருந்து கொடுத்த பின் பால் நிறுத்த காலம் என்றால் என்ன?',
      ]
    : [
        'How to improve milk FAT & SNF naturally?',
        'Optimal feeding ratio of Co-4 green grass and mineral mix',
        'Why does veterinary withdrawal hold milk supply?',
      ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.chatScroll}>
        {/* Safety Disclaimer Banner */}
        <View style={[styles.disclaimerBox, { backgroundColor: colors.primaryLight }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={[Typography.caption1, { color: colors.textSecondary, flex: 1 }]}>
            AI provides farm advisory grounded in your records. All clinical diagnoses and withdrawal rules are determined strictly by Aavin Veterinarians.
          </Text>
        </View>

        {/* Quick Suggestion Pills */}
        <View style={styles.quickPromptsRow}>
          {quickPrompts.map((p, idx) => (
            <Button
              key={idx}
              title={p}
              variant="outline"
              size="sm"
              onPress={() => sendMessage(p)}
              style={styles.promptBtn}
            />
          ))}
        </View>

        {/* Messages List */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubbleWrapper,
                isUser ? styles.userBubbleWrapper : styles.aiBubbleWrapper,
              ]}
            >
              {!isUser && (
                <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontSize: 14 }}>🤖</Text>
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  {
                    backgroundColor: isUser ? colors.primary : colors.card,
                    borderColor: isDark ? colors.border : 'transparent',
                    borderWidth: isDark ? 1 : 0,
                  },
                ]}
              >
                <Text
                  style={[
                    Typography.body,
                    { color: isUser ? '#FFFFFF' : colors.text },
                  ]}
                >
                  {msg.text}
                </Text>

                {msg.isFallback && (
                  <View style={styles.fallbackIndicator}>
                    <Text style={[Typography.caption2, { color: colors.review, fontWeight: '700' }]}>
                      ⚠️ Answered via fallback provider ({msg.provider})
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingBubble}>
            <Text style={[Typography.footnote, { color: colors.textSecondary }]}>
              Analyzing farm intelligence...
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Input Bar */}
      <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <TextField
            placeholder={user?.preferredLanguage === 'ta' ? 'கேள்வி கேட்கவும்...' : 'Ask farm advisor...'}
            value={inputText}
            onChangeText={setInputText}
            clearButton
          />
        </View>
        <Button
          title="Send"
          icon="send"
          size="sm"
          onPress={() => sendMessage()}
          disabled={!inputText.trim() || loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chatScroll: {
    padding: 16,
    paddingBottom: 20,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
  },
  quickPromptsRow: {
    marginBottom: 16,
  },
  promptBtn: {
    marginBottom: 6,
  },
  messageBubbleWrapper: {
    flexDirection: 'row',
    marginVertical: 6,
    maxWidth: '88%',
  },
  userBubbleWrapper: {
    alignSelf: 'flex-end',
    justifyContent: 'flex-end',
  },
  aiBubbleWrapper: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginTop: 4,
  },
  messageBubble: {
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  fallbackIndicator: {
    marginTop: 6,
    paddingTop: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  loadingBubble: {
    padding: 12,
    alignSelf: 'flex-start',
    marginLeft: 34,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
