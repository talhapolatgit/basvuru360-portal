import { useEffect, useId, useRef, useState } from "react";
import "./ScrollSelect.css";

export type ScrollSelectOption = {
  value: string;
  label: string;
};

type Props = {
  value: string;
  options: ScrollSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
};

export function ScrollSelect({
  value,
  options,
  onChange,
  placeholder = "Seçiniz",
  required = false,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: Props) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label || placeholder;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div
      className={`scroll-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}`}
      ref={rootRef}
    >
      <button
        type="button"
        id={selectId}
        className="scroll-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={!selected ? "scroll-select__placeholder" : undefined}>
          {label}
        </span>
        <span className="scroll-select__chevron" aria-hidden="true" />
      </button>

      <input
        className="scroll-select__native"
        value={value}
        required={required}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        onChange={() => {}}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
      />

      {open && !disabled ? (
        <ul className="scroll-select__list" role="listbox" aria-labelledby={selectId}>
          <li role="option" aria-selected={!value}>
            <button
              type="button"
              className={`scroll-select__option${!value ? " is-selected" : ""}`}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              {placeholder}
            </button>
          </li>
          {options.map((o) => (
            <li key={o.value} role="option" aria-selected={o.value === value}>
              <button
                type="button"
                className={`scroll-select__option${o.value === value ? " is-selected" : ""}`}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
