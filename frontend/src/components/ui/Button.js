import { forwardRef } from "react";

/**
 * Button — the first component in the design system.
 * Every button in the app should use this instead of a hand-rolled
 * <button style={...}> — that inconsistency (every page inventing its
 * own button styling) is exactly what caused tonight's mess.
 *
 * Variants: primary | secondary | ghost | danger
 * Sizes: sm | md | lg
 *
 * Usage:
 *   <Button onClick={submit}>Submit answer</Button>
 *   <Button variant="secondary" shortcut="⌘K">Search</Button>
 *   <Button variant="danger" loading={isEnding}>End session</Button>
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    shortcut,
    icon,
    fullWidth = false,
    type = "button",
    onClick,
    ...rest
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size}${fullWidth ? " btn-full" : ""}`}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {!loading && icon && <span className="btn-icon">{icon}</span>}
      <span className={loading ? "btn-label-loading" : undefined}>
        {children}
      </span>
      {shortcut && !loading && <span className="btn-shortcut">{shortcut}</span>}
    </button>
  );
});

export default Button;