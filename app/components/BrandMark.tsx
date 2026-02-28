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
        d="M12 20V33C12 36.866 15.134 40 19 40H22C24.95 40 27.62 38.828 29.584 36.924L24 31.34L18.933 26.273C17.026 24.366 17.026 21.275 18.933 19.368C20.84 17.461 23.931 17.461 25.838 19.368L26.22 19.75C27.588 18.382 29.805 18.382 31.173 19.75C32.541 21.118 32.541 23.336 31.173 24.704L24 31.877"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M36 20V33C36 36.866 32.866 40 29 40H26.5"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
