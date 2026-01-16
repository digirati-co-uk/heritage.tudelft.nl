const heightMap = {
  "h-1": "lg:min-h-[100px] row-span-1",
  "h-2": "lg:min-h-[200px] row-span-2",
  "h-3": "lg:min-h-[300px] row-span-3",
  "h-4": "lg:min-h-[400px] row-span-4",
  "h-5": "lg:min-h-[500px] row-span-5",
  "h-6": "lg:min-h-[600px] row-span-6",
  "h-7": "lg:min-h-[700px] row-span-7",
  "h-8": "lg:min-h-[800px] row-span-8",
  "h-9": "lg:min-h-[900px] row-span-9",
  "h-10": "lg:min-h-[1000px] row-span-10",
  "h-11": "lg:min-h-[1100px] row-span-11",
  "h-12": "lg:min-h-[1200px] row-span-12",
};

const widthMap = {
  "w-1": "col-span-1",
  "w-2": "col-span-2",
  "w-3": "col-span-3",
  "w-4": "col-span-4",
  "w-5": "col-span-5",
  "w-6": "col-span-6",
  "w-7": "col-span-7",
  "w-8": "col-span-8",
  "w-9": "col-span-9",
  "w-10": "col-span-10",
  "w-11": "col-span-11",
  "w-12": "col-span-12",
};

const startMap = {
  "start-1": "col-start-1",
  "start-2": "col-start-2",
  "start-3": "col-start-3",
  "start-4": "col-start-4",
  "start-5": "col-start-5",
  "start-6": "col-start-6",
  "start-7": "col-start-7",
  "start-8": "col-start-8",
  "start-9": "col-start-9",
};

export function getClassName(behavior?: string[], firstInfo = false, options: { fullWidthGrid?: boolean } = {}) {
  const resolvedBehavior = behavior?.length ? behavior : ["h-6", "w-12", "image"];
  let h = resolvedBehavior.find((a) => a.includes("h-")) as keyof typeof heightMap;
  let w = resolvedBehavior.find((a) => a.includes("w-")) as keyof typeof widthMap;
  let start = resolvedBehavior.find((a) => a.includes("start-")) as keyof typeof startMap;
  const classNames = [];

  if (firstInfo && h === "h-4") {
    h = "h-8";
  }

  if (options.fullWidthGrid) {
    w = "w-12";
    start = undefined as any;
  }

  classNames.push(heightMap[h]);
  classNames.push(widthMap[w]);
  if (start && startMap[start]) {
    classNames.push(startMap[start]);
  }
  return classNames.join(" ");
}

export function getFloatingFromBehaviours({
  behavior,
  defaultIsFloating = false,
  defaultFloatingPosition = "top-left",
}: {
  behavior: string[];
  defaultIsFloating?: boolean;
  defaultFloatingPosition?: string;
}) {
  let isFloating = defaultIsFloating;
  let floatingPosition = defaultFloatingPosition;
  if (behavior.includes("floating")) {
    isFloating = true;
    if (behavior.includes("float-top-left")) {
      floatingPosition = "top-left";
    } else if (behavior.includes("float-bottom-left")) {
      floatingPosition = "bottom-left";
    } else if (behavior.includes("float-top-right")) {
      floatingPosition = "top-right";
    } else if (behavior.includes("float-bottom-right")) {
      floatingPosition = "bottom-right";
    }
  }

  const floatingTop = floatingPosition === "top-left" || floatingPosition === "top-right";
  const floatingLeft = floatingPosition === "top-left" || floatingPosition === "bottom-left";

  return {
    isFloating,
    floatingPosition,
    floatingTop,
    floatingLeft,
  };
}

export function hasPageScroll(behavior?: string[]) {
  return Array.isArray(behavior) && behavior.includes("page-scroll");
}
