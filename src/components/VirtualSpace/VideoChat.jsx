
import React, { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { X, Mic, MicOff, Video, VideoOff } from 'lucide-react';

const VideoChat = ({ playerName }) => {
  const videoRef = useRef(null);
  const [micMuted, setMicMuted] = React.useState(false);
  const [videoOff, setVideoOff] = React.useState(false);
  
  // Simulate video stream with a mock video
  useEffect(() => {
    // In a real implementation, this would be using WebRTC to get actual video
    // For now, we're just creating a placeholder effect
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      
      // Function to draw a placeholder video frame
      const drawPlaceholder = () => {
        if (videoOff) {
          // Draw avatar placeholder when video is off
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw initial letter of name in a circle
          ctx.fillStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(canvas.width/2, canvas.height/2, 50, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.fillStyle = '#ffffff';
          ctx.font = '48px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(playerName.charAt(0).toUpperCase(), canvas.width/2, canvas.height/2);
        } else {
          // Draw a simple animation when video is on (simulating video)
          ctx.fillStyle = '#1e293b';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw a moving gradient to simulate video activity
          const time = Date.now() / 1000;
          const hue = (time * 10) % 360;
          
          const gradient = ctx.createLinearGradient(
            canvas.width/2 + Math.sin(time) * 50, 
            canvas.height/2 + Math.cos(time) * 50,
            canvas.width/2 - Math.sin(time) * 50, 
            canvas.height/2 - Math.cos(time) * 50
          );
          
          gradient.addColorStop(0, `hsla(${hue}, 70%, 60%, 0.5)`);
          gradient.addColorStop(1, `hsla(${hue + 60}, 70%, 60%, 0.5)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Overlay some noise for texture
          for (let i = 0; i < 500; i++) {
            const x = Math.random() * canvas.width;
            const y = Math.random() * canvas.height;
            const r = Math.random() * 2;
            ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
        
        // Stream the canvas as a video
        if (videoRef.current.srcObject === null) {
          videoRef.current.srcObject = canvas.captureStream();
        }
      };
      
      // Draw frames at 30fps
      const interval = setInterval(drawPlaceholder, 1000 / 30);
      
      return () => {
        clearInterval(interval);
        if (videoRef.current?.srcObject) {
          const tracks = videoRef.current.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      };
    }
  }, [playerName, videoOff]);
  
  return (
    <div className="video-chat-popup rounded-md overflow-hidden shadow-lg w-[320px]">
      <div className="bg-primary/10 px-3 py-2 flex justify-between items-center">
        <h4 className="text-sm font-medium">{playerName}</h4>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMicMuted(!micMuted)}>
            {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVideoOff(!videoOff)}>
            {videoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <video
        ref={videoRef}
        autoPlay
        muted={micMuted}
        className={`w-full h-auto ${videoOff ? 'brightness-50' : ''}`}
      ></video>
    </div>
  );
};

export default VideoChat;
