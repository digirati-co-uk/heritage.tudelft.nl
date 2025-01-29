import { useAtlas } from "@atlas-viewer/atlas";

export function ViewerZoomControls() {
  const atlas = useAtlas();

  if (!atlas) {
    return null;
  }

  return (
    <>
      <div className="absolute left-2 top-2 z-20 flex flex-col gap-2">
        <button onClick={() => atlas.runtime.world.zoomIn()}>
          <svg viewBox="0 0 400 400" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" d="M-1-1h582v402H-1z"></path>
            <g>
              <ellipse ry="200" rx="200" cy="200.413" cx="200" fill="#EAEAEA"></ellipse>
              <ellipse rx="100" ry="100" cy="36" cx="943.5" fill="#EAEAEA"></ellipse>
              <path d="M100 200h200M200 100v200" fill="none" stroke="#000" strokeWidth="20"></path>
            </g>
          </svg>
        </button>
        <button onClick={() => atlas.runtime.world.zoomOut()}>
          <svg viewBox="0 0 400 400" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
            <path fill="none" d="M-1-1h582v402H-1z"></path>
            <g>
              <ellipse ry="200" rx="200" cy="200.413" cx="200" fill="#EAEAEA"></ellipse>
              <ellipse rx="100" ry="100" cy="36" cx="943.5" fill="#EAEAEA"></ellipse>
              <path d="M100 200h200M200 300" fill="none" stroke="#000" strokeWidth="20"></path>
            </g>
          </svg>
        </button>
      </div>
    </>
  );
}
