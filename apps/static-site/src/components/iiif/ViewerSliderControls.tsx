import { useSimpleViewer } from "react-iiif-vault";
import { twMerge } from "tailwind-merge";

export function ViewerSliderControls() {
  const { nextCanvas, previousCanvas, currentSequenceIndex, sequence } = useSimpleViewer();
  const isLastCanvas = currentSequenceIndex === sequence.length - 1;
  const isFirstCanvas = currentSequenceIndex === 0;

  if (sequence.length < 2) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-20 flex items-center overflow-hidden">
        <button
          disabled={isFirstCanvas}
          onClick={previousCanvas}
          className={twMerge(
            isFirstCanvas ? "pointer-events-none opacity-50" : "hover:translate-x-2",
            "pointer-events-auto relative left-[-50%] aspect-square flex-none rounded-full bg-white p-5 shadow-md transition-transform"
          )}
        >
          <span className="flex translate-x-3 items-center">
            <svg viewBox="0 0 100 100" width="20px" height="20px">
              <path fill="none" d="M-1-1h582v402H-1z"></path>
              <g>
                <path
                  d="M70.173 12.294L57.446.174l-47.62 50 47.62 50 12.727-12.122-36.075-37.879z"
                  fill="currentColor"
                  fillRule="nonzero"
                ></path>
              </g>
            </svg>
          </span>
        </button>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-20 flex items-center overflow-hidden">
        <button
          onClick={nextCanvas}
          disabled={isLastCanvas}
          className={twMerge(
            isLastCanvas ? "pointer-events-none opacity-50" : "hover:-translate-x-2",
            "pointer-events-auto relative right-[-50%] aspect-square flex-none rounded-full bg-white p-5 shadow-md transition-transform"
          )}
        >
          <span className="flex -translate-x-3 items-center">
            <svg className="rotate-180" viewBox="0 0 100 100" width="20px" height="20px">
              <path fill="none" d="M-1-1h582v402H-1z"></path>
              <g>
                <path
                  d="M70.173 12.294L57.446.174l-47.62 50 47.62 50 12.727-12.122-36.075-37.879z"
                  fill="currentColor"
                  fillRule="nonzero"
                ></path>
              </g>
            </svg>
          </span>
        </button>
      </div>
    </>
  );
}
