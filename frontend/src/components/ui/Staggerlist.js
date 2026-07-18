import { Children } from "react";

/**
 * StaggerList — rule 17 (Cascading Data Entrances).
 * Wrap any list of items and each one fades/slides in 50ms after
 * the previous one, instead of the whole list blinking onto the
 * screen at once. This is real motion, not decoration — it's what
 * makes a dashboard feel alive on load.
 *
 * Usage:
 *   <StaggerList>
 *     {sessions.map(s => <SessionRow key={s.id} {...s} />)}
 *   </StaggerList>
 *
 * Each child is automatically wrapped with the stagger animation —
 * you don't need to add any className yourself.
 */
export default function StaggerList({ children }) {
  return Children.map(children, (child, index) => {
    if (!child) return child;
    return (
      <div
        className="ds-stagger-item"
        style={{ "--stagger-index": index }}
      >
        {child}
      </div>
    );
  });
}