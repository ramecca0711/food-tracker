interface BrandMarkProps {
  className?: string;
}

export default function BrandMark({ className = 'h-9 w-9' }: BrandMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      role="img"
      aria-label="Home Base logo"
    >
      <path
        d="M8 22L24 8L40 22"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 20V33C12 36.866 15.134 40 19 40H29C32.866 40 36 36.866 36 33V20"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M24 31.5C24 31.5 16 26.2 16 21.2C16 18.4 18.2 16.2 21 16.2C22.6 16.2 23.9 17 24 18.2C24.1 17 25.4 16.2 27 16.2C29.8 16.2 32 18.4 32 21.2C32 26.2 24 31.5 24 31.5Z"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
