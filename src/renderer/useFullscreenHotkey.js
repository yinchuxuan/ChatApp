import React from 'react';

function useFullscreenHotkey(windowService) {
  React.useEffect(() => {
    let pending = false;
    const handleKeyDown = async (event) => {
      if (event.key !== 'F11' || event.repeat || pending) return;
      event.preventDefault();
      pending = true;
      try {
        const fullscreen = await windowService.isFullscreen();
        await windowService.setFullscreen(!fullscreen);
      } catch (error) {
        console.error('Failed to toggle native fullscreen', error);
      } finally {
        pending = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windowService]);
}

export default useFullscreenHotkey;
