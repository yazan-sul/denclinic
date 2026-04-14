'use client';

import { useState } from 'react';

interface Message {
  id: number;
  name: string;
  phone: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
}

interface MessageThread {
  id: number;
  sender: string;
  content: string;
  timestamp: string;
  isOwn: boolean;
}

const MessagesPanel = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      name: 'أحمد محمد',
      phone: '966501234567',
      lastMessage: 'شكراً على الخدمة الممتازة',
      timestamp: 'قبل 5 دقائق',
      unread: 2,
      avatar: '👨‍🦱',
    },
    {
      id: 2,
      name: 'فاطمة علي',
      phone: '966501234568',
      lastMessage: 'هل يمكن تقديم الموعد؟',
      timestamp: 'قبل ساعة',
      unread: 1,
      avatar: '👩‍🦰',
    },
    {
      id: 3,
      name: 'محمود حسن',
      phone: '966501234569',
      lastMessage: 'تم وصول الفاتورة',
      timestamp: 'أمس',
      unread: 0,
      avatar: '👨‍🔬',
    },
  ]);

  const [selectedConversation, setSelectedConversation] = useState<Message | null>(messages[0] || null);
  const [threadMessages, setThreadMessages] = useState<MessageThread[]>([
    {
      id: 1,
      sender: 'أحمد محمد',
      content: 'السلام عليكم، هل يمكن حجز موعد؟',
      timestamp: '10:30 AM',
      isOwn: false,
    },
    {
      id: 2,
      sender: 'أنت',
      content: 'وعليكم السلام، بالتأكيد. كم تفضل ميعاد؟',
      timestamp: '10:35 AM',
      isOwn: true,
    },
    {
      id: 3,
      sender: 'أحمد محمد',
      content: 'الإثنين الساعة 10:00 صباحاً',
      timestamp: '10:40 AM',
      isOwn: false,
    },
    {
      id: 4,
      sender: 'أنت',
      content: 'تمام. سيتم تأكيد الموعد',
      timestamp: '10:42 AM',
      isOwn: true,
    },
  ]);

  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation) return;

    const message: MessageThread = {
      id: threadMessages.length + 1,
      sender: 'أنت',
      content: newMessage,
      timestamp: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true,
    };

    setThreadMessages([...threadMessages, message]);
    setNewMessage('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      {/* Conversations List */}
      <div className="lg:col-span-1 bg-card rounded-lg border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold">المحادثات</h3>
        </div>
        <div className="overflow-y-auto max-h-96">
          {messages.map((msg) => (
            <button
              key={msg.id}
              onClick={() => setSelectedConversation(msg)}
              className={`w-full p-4 border-b border-border text-right transition-colors hover:bg-secondary ${
                selectedConversation?.id === msg.id ? 'bg-primary/10 border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{msg.avatar}</span>
                  <div>
                    <p className="font-semibold text-sm">{msg.name}</p>
                    <p className="text-xs text-muted-foreground">{msg.phone}</p>
                  </div>
                </div>
                {msg.unread > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {msg.unread}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">{msg.lastMessage}</p>
              <p className="text-xs text-muted-foreground mt-1">{msg.timestamp}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat View */}
      <div className="lg:col-span-2 bg-card rounded-lg border border-border flex flex-col">
        {selectedConversation ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold">{selectedConversation.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedConversation.phone}</p>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-80">
              {threadMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.isOwn ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      msg.isOwn
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-foreground border border-border'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-1">{msg.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="اكتب رسالة..."
                  className="flex-1 px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleSendMessage}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  إرسال
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>اختر محادثة للبدء</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessagesPanel;
