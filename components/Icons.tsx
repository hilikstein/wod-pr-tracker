export function IconStar({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M12 3.4 14.4 9l6.1.5-4.7 4 1.5 5.9L12 16.6 6.7 19.4l1.5-5.9-4.7-4 6.1-.5Z" />
    </svg>
  );
}

export function IconRings() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <path d="M8 3v5M16 3v5" />
      <circle cx="8" cy="14" r="5" />
      <circle cx="16" cy="14" r="5" />
    </svg>
  );
}

export function IconBar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" aria-hidden>
      <path d="M2 12h4M18 12h4M6 12h12M5 8v8M7 9v6M19 8v8M17 9v6" />
    </svg>
  );
}

export function IconPerson() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.9-3.7 3.8-5.6 7.5-5.6s6.6 1.9 7.5 5.6" />
    </svg>
  );
}

export function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 19.5c.8-3.3 3.1-5 6.2-5s5.4 1.7 6.2 5" />
      <path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8M18 14.9c1.8.7 2.9 2.2 3.4 4.6" />
    </svg>
  );
}
