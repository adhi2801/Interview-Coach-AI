export default function Input({ label, error, id, ...rest }) {
  return (
    <div className="ds-field">
      {label && (
        <label htmlFor={id} className="ds-label">
          {label}
        </label>
      )}
      <input id={id} className={`ds-input${error ? " ds-input-error" : ""}`} {...rest} />
      {error && <span className="ds-error-text">{error}</span>}
    </div>
  );
}