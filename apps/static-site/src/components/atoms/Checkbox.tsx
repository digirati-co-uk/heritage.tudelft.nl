import { Checkbox as BaseCheckbox } from "react-aria-components";
import type { CheckboxProps } from "react-aria-components";

export function Checkbox({
  children,
  ...props
}: Omit<CheckboxProps, "children"> & {
  children?: React.ReactNode;
}) {
  return (
    <BaseCheckbox {...props}>
      {({ isIndeterminate }) => (
        <>
          <div className="checkbox">
            <svg viewBox="0 0 18 18" aria-hidden="true">
              {isIndeterminate ? (
                <rect x={1} y={7.5} width={15} height={3} />
              ) : (
                <polyline points="1 9 7 14 15 4" />
              )}
            </svg>
          </div>
          {children}
        </>
      )}
    </BaseCheckbox>
  );
}
