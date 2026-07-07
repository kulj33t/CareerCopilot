export default function BrandMark({ size = 34 }) {
  return (
    <div
      className="brand-mark"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.65,
        borderRadius: size * 0.3,
      }}
    >
      C
    </div>
  );
}
