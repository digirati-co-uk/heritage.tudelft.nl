export function CloseIcon({ fill }: { fill?: string }) {
  return (
    <svg
      width={20}
      height={20}
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16.5 16.5"
      xmlSpace="preserve"
    >
      <polygon
        points="14.8,0 8.2,6.6 1.7,0 0,1.7 6.6,8.2 0,14.8 1.7,16.5 8.2,9.9 14.8,16.5 16.5,14.8 9.9,8.2 16.5,1.7"
        fill={fill || "#000"}
      ></polygon>
    </svg>
  );
}
