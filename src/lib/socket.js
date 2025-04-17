
import { io } from 'socket.io-client';

// Since we don't have a real backend, we'll mock the socket behavior
// In a real app, this would connect to your backend server
// Example: export const socket = io('https://your-api-server.com');

// Create a mock socket implementation
const createMockSocket = () => {
  // In-memory store of connected players
  const players = {};
  
  // Socket event listeners
  const eventListeners = {};
  
  // Generate a random socket ID
  const socketId = `socket_${Math.random().toString(36).substring(2, 9)}`;
  
  // Create mock socket instance
  const socket = {
    id: socketId,
    connected: false,
    
    // Connect to the mock server
    connect: function() {
      this.connected = true;
      this._triggerEvent('connect');
      
      // Simulate some latency
      setTimeout(() => {
        // Send existing players to the new connection
        if (Object.keys(players).length > 0) {
          this._triggerEvent('playerUpdate', { ...players });
        }
      }, 500);
      
      return this;
    },
    
    // Disconnect from the mock server
    disconnect: function() {
      if (this.connected) {
        this.connected = false;
        
        // Remove player from the list
        if (players[this.id]) {
          delete players[this.id];
          
          // Broadcast player left to all "other clients"
          this._mockBroadcast('playerLeft', this.id);
        }
        
        this._triggerEvent('disconnect');
      }
      
      return this;
    },
    
    // Register event listeners
    on: function(event, callback) {
      if (!eventListeners[event]) {
        eventListeners[event] = [];
      }
      
      eventListeners[event].push(callback);
      return this;
    },
    
    // Remove event listeners
    off: function(event, callback) {
      if (eventListeners[event]) {
        if (callback) {
          eventListeners[event] = eventListeners[event].filter(cb => cb !== callback);
        } else {
          delete eventListeners[event];
        }
      }
      
      return this;
    },
    
    // Emit events to the mock server
    emit: function(event, ...args) {
      if (!this.connected) return this;
      
      // Handle mock server-side logic
      switch (event) {
        case 'join':
          // Add player to the players list
          const playerData = args[0];
          players[this.id] = playerData;
          
          // Broadcast new player to all "other clients"
          this._mockBroadcast('playerUpdate', { ...players });
          break;
          
        case 'playerMove':
          // Update player position
          if (players[this.id]) {
            players[this.id] = {
              ...players[this.id],
              ...args[0]
            };
            
            // Broadcast updated players to all clients
            this._mockBroadcast('playerUpdate', { ...players });
          }
          break;
          
        case 'chatMessage':
          // Broadcast chat message to all clients
          this._mockBroadcast('chatMessage', args[0]);
          break;
          
        case 'interaction':
          // Broadcast interaction only to players in proximity
          const interactionData = args[0];
          const currentPlayer = players[this.id];
          
          if (currentPlayer) {
            // Find players in proximity
            Object.entries(players).forEach(([id, player]) => {
              if (id !== this.id) {
                // Calculate distance between players
                const distance = Math.sqrt(
                  Math.pow(currentPlayer.x - player.x, 2) + 
                  Math.pow(currentPlayer.y - player.y, 2)
                );
                
                // If within range (e.g., 150 pixels), send interaction
                if (distance < 150) {
                  // In a real implementation, this would only go to specific sockets
                  // Here we broadcast to all for simplicity
                  this._triggerEvent('interaction', interactionData);
                }
              }
            });
          }
          break;
      }
      
      return this;
    },
    
    // Private method to trigger events on this socket
    _triggerEvent: function(event, ...args) {
      if (eventListeners[event]) {
        eventListeners[event].forEach(callback => {
          callback(...args);
        });
      }
    },
    
    // Private method to simulate broadcasting to other clients
    _mockBroadcast: function(event, ...args) {
      // In a real implementation, this would be done server-side
      // For our mock, we trigger the event on our own socket
      this._triggerEvent(event, ...args);
    }
  };
  
  return socket;
};

// Export a singleton mock socket instance
export const socket = createMockSocket();
