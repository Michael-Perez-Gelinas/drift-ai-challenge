import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlClasses =
  "w-full rounded-card border border-border-default bg-surface-raised px-4 py-3 text-base text-text-primary placeholder:text-text-muted " +
  "transition-colors duration-fast ease-default " +
  "focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-border-focus/30";

type BaseProps = {
  label: string;
  /** Optional hint or helper text shown under the label. */
  hint?: string;
  className?: string;
  /**
   * A custom control. Pass a render function to receive the generated control
   * id so the label's `htmlFor` resolves (apply it to your control's `id`).
   */
  children?: ReactNode | ((controlId: string) => ReactNode);
};

type InputFieldProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "children"> & {
    as?: "input";
  };

type TextareaFieldProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "children"> & {
    as: "textarea";
  };

type FieldProps = InputFieldProps | TextareaFieldProps;

/**
 * A labeled form control. Renders an `<input>` by default or a `<textarea>`
 * when `as="textarea"`. Pass `children` to wrap a custom control (e.g. a
 * select) and only render the label + hint.
 */
export function Field(props: FieldProps) {
  const { label, hint, id, children, className } = props;
  const controlId =
    id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  let control: ReactNode;
  if (children) {
    control = typeof children === "function" ? children(controlId) : children;
  } else if (props.as === "textarea") {
    const { label: _label, hint: _hint, as: _as, children: _children, ...rest } = props;
    void _label;
    void _hint;
    void _as;
    void _children;
    control = (
      <textarea
        id={controlId}
        className={cn(controlClasses, "min-h-24 resize-y")}
        {...rest}
      />
    );
  } else {
    const { label: _label, hint: _hint, as: _as, children: _children, ...rest } = props;
    void _label;
    void _hint;
    void _as;
    void _children;
    control = <input id={controlId} className={controlClasses} {...rest} />;
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <label
        htmlFor={controlId}
        className="text-sm font-medium text-text-secondary"
      >
        {label}
      </label>
      {control}
      {hint ? <p className="text-xs text-text-muted">{hint}</p> : null}
    </div>
  );
}
