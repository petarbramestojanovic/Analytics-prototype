// Brame accent colors, excluding lime/cream (too low-contrast for white
// initials) and dark/teal (too close to the sidebar and card backgrounds
// this renders against).
const PALETTE = ['#077070', '#6b5b95', '#40b8b8', '#8b7bb5', '#c5772e', '#2e6ac5'];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase();
}

export default function Avatar({
  name,
  imageUrl,
  size = 32,
}: {
  name: string;
  imageUrl?: string | null;
  size?: number;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={name}
        style={{ width: size, height: size }}
        className="flex-shrink-0 rounded-full object-cover"
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, backgroundColor: colorForName(name), fontSize: size * 0.38 }}
      className="flex flex-shrink-0 items-center justify-center rounded-full font-semibold text-white"
    >
      {initialsFor(name) || '?'}
    </div>
  );
}
