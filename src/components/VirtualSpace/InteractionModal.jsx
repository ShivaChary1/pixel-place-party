
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const InteractionModal = ({ data, onClose }) => {
  const [isOpen, setIsOpen] = React.useState(true);
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(onClose, 300); // Wait for animation to finish
  };
  
  // Get content based on object type
  const renderContent = () => {
    if (!data) return null;
    
    const type = data.type || 'generic';
    const properties = data.properties || [];
    
    switch (type) {
      case 'video':
        // Find YouTube video ID from properties
        const videoId = properties.find(p => p.name === 'videoId')?.value;
        
        if (videoId) {
          return (
            <div className="aspect-video w-full">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}`}
                className="w-full h-full rounded-md"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          );
        }
        break;
        
      case 'image':
        // Find image URL from properties
        const imageUrl = properties.find(p => p.name === 'imageUrl')?.value;
        
        if (imageUrl) {
          return (
            <div className="flex justify-center">
              <img 
                src={imageUrl} 
                alt={data.name} 
                className="max-w-full max-h-[50vh] object-contain rounded-md"
              />
            </div>
          );
        }
        break;
        
      case 'note':
        // Find note content from properties
        const noteContent = properties.find(p => p.name === 'content')?.value;
        
        if (noteContent) {
          return (
            <div className="p-4 bg-muted rounded-md">
              <p className="whitespace-pre-wrap">{noteContent}</p>
            </div>
          );
        }
        break;
        
      case 'weblink':
        // Find web URL from properties
        const webUrl = properties.find(p => p.name === 'url')?.value;
        const description = properties.find(p => p.name === 'description')?.value;
        
        if (webUrl) {
          return (
            <div className="flex flex-col gap-4">
              {description && <p>{description}</p>}
              <div className="flex justify-center">
                <Button asChild>
                  <a href={webUrl} target="_blank" rel="noopener noreferrer">
                    Open Link
                  </a>
                </Button>
              </div>
            </div>
          );
        }
        break;
        
      default:
        // Generic object properties display
        return (
          <div className="space-y-2">
            {properties.map((prop, index) => (
              <div key={index} className="flex gap-2">
                <span className="font-medium">{prop.name}:</span>
                <span>{prop.value}</span>
              </div>
            ))}
          </div>
        );
    }
    
    // Fallback if no specific content rendering matches
    return (
      <p className="text-center">No additional information available.</p>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl" onInteractOutside={handleClose}>
        <DialogHeader>
          <DialogTitle>{data?.name || 'Interaction'}</DialogTitle>
          <DialogDescription>
            {data?.description || 'You have interacted with an object.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          {renderContent()}
        </div>
        
        <DialogFooter>
          <Button onClick={handleClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InteractionModal;
