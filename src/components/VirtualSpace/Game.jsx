
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Phaser from 'phaser';

// The Game component is where we initialize and manage our Phaser game instance
const Game = forwardRef(({ onPlayerMove, onInteraction, players, currentPlayerId }, ref) => {
  const gameContainerRef = useRef(null);
  const gameInstanceRef = useRef(null);
  
  // Expose methods to parent component through ref
  useImperativeHandle(ref, () => ({
    getGameInstance: () => gameInstanceRef.current
  }));
  
  useEffect(() => {
    // Only create the game once when the component mounts
    if (gameContainerRef.current && !gameInstanceRef.current) {
      // Configure the Phaser game
      const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight - 200, // Subtract chat area height
        parent: gameContainerRef.current,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0 },
            debug: false
          }
        },
        scene: {
          preload: preload,
          create: create,
          update: update
        }
      };
      
      // Create new Phaser game instance
      gameInstanceRef.current = new Phaser.Game(config);
      
      // Store references for use in Phaser scene functions
      const gameRefs = {
        onPlayerMove,
        onInteraction,
        players,
        currentPlayerId,
        playerSprites: {},
        cursors: null,
        player: null,
        map: null,
        interactables: [],
        lastMovementEmitted: 0
      };
      
      // Phaser scene functions
      function preload() {
        // Load map tiles
        this.load.image('tiles', '/assets/tilemaps/office-tileset.png');
        this.load.tilemapTiledJSON('map', '/assets/tilemaps/office-map.json');
        
        // Load sprites for different avatars
        for (let i = 1; i <= 4; i++) {
          this.load.spritesheet(`avatar${i}`, 
            `/assets/avatars/avatar${i}_spritesheet.png`,
            { frameWidth: 32, frameHeight: 48 }
          );
        }
        
        // Load interactable object images
        this.load.image('poster', '/assets/objects/poster.png');
        this.load.image('computer', '/assets/objects/computer.png');
        this.load.image('whiteboard', '/assets/objects/whiteboard.png');
      }
      
      function create() {
        // Create the map from the loaded tilemap
        gameRefs.map = this.make.tilemap({ key: 'map' });
        
        // Add the tileset to the map
        const tileset = gameRefs.map.addTilesetImage('office-tileset', 'tiles');
        
        // Create layers from the map
        const floorLayer = gameRefs.map.createLayer('Floor', tileset);
        const wallsLayer = gameRefs.map.createLayer('Walls', tileset);
        const decorLayer = gameRefs.map.createLayer('Decorations', tileset);
        
        // Set collision with walls
        wallsLayer.setCollisionByProperty({ collides: true });
        
        // Create animations for all avatar types
        for (let i = 1; i <= 4; i++) {
          // Walking animations for each direction
          this.anims.create({
            key: `avatar${i}_left`,
            frames: this.anims.generateFrameNumbers(`avatar${i}`, { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
          });
          
          this.anims.create({
            key: `avatar${i}_right`,
            frames: this.anims.generateFrameNumbers(`avatar${i}`, { start: 4, end: 7 }),
            frameRate: 10,
            repeat: -1
          });
          
          this.anims.create({
            key: `avatar${i}_up`,
            frames: this.anims.generateFrameNumbers(`avatar${i}`, { start: 8, end: 11 }),
            frameRate: 10,
            repeat: -1
          });
          
          this.anims.create({
            key: `avatar${i}_down`,
            frames: this.anims.generateFrameNumbers(`avatar${i}`, { start: 12, end: 15 }),
            frameRate: 10,
            repeat: -1
          });
        }
        
        // Setup the player at the default spawn location
        const spawnX = gameRefs.map.properties?.find(p => p.name === 'spawnX')?.value || 400;
        const spawnY = gameRefs.map.properties?.find(p => p.name === 'spawnY')?.value || 300;
        
        // Get the avatar number from players object
        const avatarNumber = gameRefs.players[gameRefs.currentPlayerId]?.avatar || 1;
        
        // Create player sprite for the current player
        gameRefs.player = this.physics.add.sprite(spawnX, spawnY, `avatar${avatarNumber}`);
        gameRefs.player.setCollideWorldBounds(true);
        gameRefs.player.body.setSize(24, 32).setOffset(4, 16);
        
        // Add collisions between player and walls
        this.physics.add.collider(gameRefs.player, wallsLayer);
        
        // Setup camera to follow the player
        this.cameras.main.startFollow(gameRefs.player, true);
        this.cameras.main.setZoom(1.5);
        
        // Create interactive objects from object layer in Tiled
        if (gameRefs.map.getObjectLayer('Interactables')) {
          const objLayer = gameRefs.map.getObjectLayer('Interactables');
          
          objLayer.objects.forEach(obj => {
            // Create sprite for the interactable object
            const sprite = this.physics.add.sprite(obj.x, obj.y, obj.properties?.find(p => p.name === 'sprite')?.value || 'poster');
            sprite.setOrigin(0, 1); // Set origin to bottom-left to match Tiled coordinates
            
            // Store object properties with the sprite
            sprite.interactableData = {
              id: obj.id,
              name: obj.name,
              type: obj.type,
              properties: obj.properties
            };
            
            // Add to interactables array
            gameRefs.interactables.push(sprite);
            
            // Make interactable clickable
            sprite.setInteractive();
            sprite.on('pointerdown', () => {
              // Check if player is close enough to interact (within 100 pixels)
              const distance = Phaser.Math.Distance.Between(
                gameRefs.player.x, gameRefs.player.y,
                sprite.x + sprite.width / 2, sprite.y - sprite.height / 2
              );
              
              if (distance < 100) {
                gameRefs.onInteraction(sprite.interactableData);
              } else {
                // Show "too far" message
                const text = this.add.text(
                  gameRefs.player.x, 
                  gameRefs.player.y - 40, 
                  'Too far away!', 
                  { fontSize: '14px', fill: '#fff', backgroundColor: '#000', padding: { x: 4, y: 2 } }
                );
                
                // Make text fade out and destroy after 1.5 seconds
                this.tweens.add({
                  targets: text,
                  alpha: 0,
                  y: text.y - 20,
                  duration: 1500,
                  onComplete: () => text.destroy()
                });
              }
            });
          });
        }
        
        // Setup keyboard controls
        gameRefs.cursors = this.input.keyboard.createCursorKeys();
        
        // Add WASD keys
        gameRefs.wasd = {
          up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
          left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
          down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
          right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
      }
      
      function update(time) {
        if (!gameRefs.player) return;
        
        // Handle movement with arrow keys or WASD
        const cursors = gameRefs.cursors;
        const wasd = gameRefs.wasd;
        const player = gameRefs.player;
        
        // Reset velocity
        player.setVelocity(0);
        
        // Track if player is moving and in which direction
        let moving = false;
        let direction = 'down'; // Default direction
        
        // Check for horizontal movement
        if (cursors.left.isDown || wasd.left.isDown) {
          player.setVelocityX(-160);
          player.anims.play(`avatar${players[currentPlayerId]?.avatar || 1}_left`, true);
          moving = true;
          direction = 'left';
        } else if (cursors.right.isDown || wasd.right.isDown) {
          player.setVelocityX(160);
          player.anims.play(`avatar${players[currentPlayerId]?.avatar || 1}_right`, true);
          moving = true;
          direction = 'right';
        }
        
        // Check for vertical movement
        if (cursors.up.isDown || wasd.up.isDown) {
          player.setVelocityY(-160);
          
          // Only change animation if not moving horizontally
          if (!moving) {
            player.anims.play(`avatar${players[currentPlayerId]?.avatar || 1}_up`, true);
            moving = true;
            direction = 'up';
          }
        } else if (cursors.down.isDown || wasd.down.isDown) {
          player.setVelocityY(160);
          
          // Only change animation if not moving horizontally
          if (!moving) {
            player.anims.play(`avatar${players[currentPlayerId]?.avatar || 1}_down`, true);
            moving = true;
            direction = 'down';
          }
        }
        
        // If not moving, stop animations and show standing frame
        if (!moving) {
          player.anims.stop();
          
          // Set the default standing frame based on the last direction
          if (player.anims.currentAnim) {
            const anim = player.anims.currentAnim.key;
            direction = anim.split('_')[1];
            
            // Set specific frame for standing
            switch (direction) {
              case 'left':
                player.setFrame(0);
                break;
              case 'right':
                player.setFrame(4);
                break;
              case 'up':
                player.setFrame(8);
                break;
              case 'down':
                player.setFrame(12);
                break;
            }
          }
        }
        
        // Update other player sprites if they exist in the game
        Object.entries(gameRefs.players).forEach(([id, playerData]) => {
          if (id !== gameRefs.currentPlayerId) {
            // If this player sprite doesn't exist yet, create it
            if (!gameRefs.playerSprites[id]) {
              const sprite = this.add.sprite(playerData.x, playerData.y, `avatar${playerData.avatar}`);
              
              // Add player name above the sprite
              const nameText = this.add.text(
                playerData.x, 
                playerData.y - 35, 
                playerData.name, 
                { fontSize: '12px', fill: '#fff', backgroundColor: '#000', padding: { x: 3, y: 1 } }
              );
              nameText.setOrigin(0.5);
              
              gameRefs.playerSprites[id] = { sprite, nameText };
            }
            
            // Update existing player sprite position and animation
            const { sprite, nameText } = gameRefs.playerSprites[id];
            
            // Move sprite to player position with a slight lerp for smoothness
            sprite.x = Phaser.Math.Linear(sprite.x, playerData.x, 0.5);
            sprite.y = Phaser.Math.Linear(sprite.y, playerData.y, 0.5);
            
            // Update name text position
            nameText.x = sprite.x;
            nameText.y = sprite.y - 35;
            
            // Handle animations based on player state
            if (playerData.moving) {
              sprite.anims.play(`avatar${playerData.avatar}_${playerData.direction}`, true);
            } else {
              sprite.anims.stop();
              
              // Set standing frame based on direction
              switch (playerData.direction) {
                case 'left':
                  sprite.setFrame(0);
                  break;
                case 'right':
                  sprite.setFrame(4);
                  break;
                case 'up':
                  sprite.setFrame(8);
                  break;
                case 'down':
                  sprite.setFrame(12);
                  break;
              }
            }
          }
        });
        
        // Clean up sprites for players who left
        Object.keys(gameRefs.playerSprites).forEach(id => {
          if (!gameRefs.players[id] && id !== gameRefs.currentPlayerId) {
            // Destroy sprite and name text
            gameRefs.playerSprites[id].sprite.destroy();
            gameRefs.playerSprites[id].nameText.destroy();
            delete gameRefs.playerSprites[id];
          }
        });
        
        // Only emit movement every 100ms to reduce network traffic
        if (time > gameRefs.lastMovementEmitted + 100) {
          gameRefs.lastMovementEmitted = time;
          
          // Emit player movement to server
          gameRefs.onPlayerMove({
            x: player.x,
            y: player.y,
            direction,
            moving
          });
        }
      }
    }
    
    // Handle window resize
    const handleResize = () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.scale.resize(
          window.innerWidth,
          window.innerHeight - 200  // Subtract chat area height
        );
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true);
        gameInstanceRef.current = null;
      }
    };
  }, []);
  
  // Update game references when props change
  useEffect(() => {
    if (gameInstanceRef.current) {
      const scene = gameInstanceRef.current.scene.scenes[0];
      if (scene) {
        // Update players reference
        scene.players = players;
      }
    }
  }, [players]);
  
  return <div ref={gameContainerRef} className="w-full h-full" />;
});

Game.displayName = 'Game';

export default Game;
