
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

const Chat = ({ socket, userName }) => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  
  // Handle sending a new message
  const sendMessage = (e) => {
    e.preventDefault();
    
    if (message.trim() && socket.connected) {
      const newMessage = {
        id: Date.now(),
        sender: userName,
        text: message,
        timestamp: new Date().toISOString()
      };
      
      // Emit message to server
      socket.emit('chatMessage', newMessage);
      
      // Add to local messages
      setMessages(prev => [...prev, { ...newMessage, own: true }]);
      
      // Clear input
      setMessage('');
    }
  };
  
  // Listen for incoming messages
  useEffect(() => {
    socket.on('chatMessage', (msg) => {
      // Add received message to state
      setMessages(prev => [...prev, { ...msg, own: false }]);
    });
    
    return () => {
      socket.off('chatMessage');
    };
  }, [socket]);
  
  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  return (
    <div className="h-full flex flex-col p-3">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium">Chat</h3>
        <span className="text-xs text-muted-foreground">
          {socket.connected ? (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span> Connected
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span> Disconnected
            </span>
          )}
        </span>
      </div>
      
      <ScrollArea className="flex-grow mb-3 p-3 bg-muted/30 rounded-md">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-4">
              No messages yet. Start the conversation!
            </p>
          ) : (
            messages.map((msg) => (
              <div 
                key={msg.id}
                className={`chat-message ${msg.own ? 'own' : 'other'}`}
              >
                <div className="flex items-center gap-1">
                  <span className="font-semibold text-xs">
                    {msg.own ? 'You' : msg.sender}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm">{msg.text}</p>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <form onSubmit={sendMessage} className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-grow"
        />
        <Button type="submit" disabled={!message.trim() || !socket.connected}>
          Send
        </Button>
      </form>
    </div>
  );
};

export default Chat;
