
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import Game from './Game';
import Chat from './Chat';
import VideoChat from './VideoChat';
import InteractionModal from './InteractionModal';
import { socket } from '@/lib/socket';
import { cn } from '@/lib/utils';

const VirtualSpace = () => {
  const [userName, setUserName] = useState('');
  const [joinedSpace, setJoinedSpace] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [players, setPlayers] = useState({});
  const [showInteractionModal, setShowInteractionModal] = useState(false);
  const [interactionData, setInteractionData] = useState(null);
  const [videoChatPartners, setVideoChatPartners] = useState([]);
  const gameRef = useRef(null);
  
  // Available avatars (1-4)
  const avatars = [1, 2, 3, 4];
  
  // Handle joining the virtual space
  const handleJoinSpace = () => {
    if (userName.trim()) {
      // Initialize socket connection
      socket.connect();
      
      // Emit join event to server with user data
      socket.emit('join', {
        id: socket.id,
        name: userName,
        avatar: selectedAvatar,
        x: 400,
        y: 300,
        direction: 'down',
        moving: false
      });
      
      // Set joined state to true to show the game
      setJoinedSpace(true);
    }
  };
  
  // Listen for player updates from the server
  useEffect(() => {
    if (joinedSpace) {
      socket.on('playerUpdate', (allPlayers) => {
        setPlayers(allPlayers);
      });
      
      socket.on('playerLeft', (playerId) => {
        setPlayers(prev => {
          const newPlayers = { ...prev };
          delete newPlayers[playerId];
          return newPlayers;
        });
        
        // Remove from video chat if they were connected
        setVideoChatPartners(prev => prev.filter(p => p.id !== playerId));
      });
      
      // Listen for interaction events
      socket.on('interaction', (data) => {
        setInteractionData(data);
        setShowInteractionModal(true);
      });
      
      return () => {
        socket.off('playerUpdate');
        socket.off('playerLeft');
        socket.off('interaction');
      };
    }
  }, [joinedSpace]);
  
  // Handle player movement and update other players
  const handlePlayerMove = (playerData) => {
    if (socket.connected) {
      socket.emit('playerMove', playerData);
    }
  };
  
  // Handle player interaction with objects
  const handleInteraction = (objectData) => {
    setInteractionData(objectData);
    setShowInteractionModal(true);
    
    // Broadcast interaction to nearby players
    if (socket.connected) {
      socket.emit('interaction', {
        playerId: socket.id,
        objectData
      });
    }
  };
  
  // Check proximity between players for video chat
  useEffect(() => {
    if (joinedSpace && players && players[socket.id]) {
      const currentPlayer = players[socket.id];
      const closePlayerIds = [];
      
      // Check proximity with other players
      Object.entries(players).forEach(([id, player]) => {
        if (id !== socket.id) {
          const distance = Math.sqrt(
            Math.pow(currentPlayer.x - player.x, 2) + 
            Math.pow(currentPlayer.y - player.y, 2)
          );
          
          // If players are within 150 pixels, consider them close enough for video chat
          if (distance < 150) {
            closePlayerIds.push({ id, name: player.name });
          }
        }
      });
      
      setVideoChatPartners(closePlayerIds);
    }
  }, [players, joinedSpace]);
  
  // Close the interaction modal
  const closeInteractionModal = () => {
    setShowInteractionModal(false);
    setInteractionData(null);
  };
  
  if (!joinedSpace) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-accent/50 to-background">
        <Card className="w-full max-w-md p-6 space-y-6">
          <h1 className="text-3xl font-bold text-center text-primary">Virtual Space</h1>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium leading-none">
                Enter your name
              </label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Your name"
                className="mt-1"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium leading-none">
                Choose an avatar
              </label>
              <div className="flex justify-center gap-4 mt-3">
                {avatars.map((avatar) => (
                  <div 
                    key={avatar}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={cn(
                      "w-16 h-16 cursor-pointer rounded-md border-2 p-1 transition-all",
                      selectedAvatar === avatar 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <img 
                      src={`/assets/avatars/avatar${avatar}_down.png`} 
                      alt={`Avatar ${avatar}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleJoinSpace} 
            disabled={!userName.trim()}
            className="w-full"
          >
            Join Space
          </Button>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col h-screen">
      <div className="relative flex-grow">
        <Game 
          ref={gameRef}
          onPlayerMove={handlePlayerMove}
          onInteraction={handleInteraction}
          players={players}
          currentPlayerId={socket.id}
        />
        
        {/* Video chat overlay */}
        {videoChatPartners.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            {videoChatPartners.map(partner => (
              <VideoChat key={partner.id} playerName={partner.name} />
            ))}
          </div>
        )}
      </div>
      
      {/* Chat component at the bottom */}
      <div className="h-[200px] bg-background border-t border-border">
        <Chat socket={socket} userName={userName} />
      </div>
      
      {/* Interaction modal */}
      {showInteractionModal && interactionData && (
        <InteractionModal 
          data={interactionData} 
          onClose={closeInteractionModal} 
        />
      )}
    </div>
  );
};

export default VirtualSpace;
