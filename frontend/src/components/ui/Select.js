export default function Select({ label, id, children, ...rest }) {
  return (
    <div className="ds-field">
      {label && (
        <label htmlFor={id} className="ds-label">
          {label}
        </label>
      )}
      <select id={id} className="ds-select" {...rest}>
        {children}
      </select>
    </div>
  );
}