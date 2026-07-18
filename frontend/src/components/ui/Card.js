export default function Card({ children, hoverable = false, className = "", style = {}, ...rest }) {
  return (
    <div
      className={`ds-card${hoverable ? " ds-card-hoverable" : ""} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </div>
  );
}