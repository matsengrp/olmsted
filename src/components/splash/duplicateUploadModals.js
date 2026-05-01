import React, { useState } from "react";
import { FiAlertTriangle } from "react-icons/fi";

const overlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 10000
};

const dialogStyle = {
  backgroundColor: "#fff",
  borderRadius: 8,
  width: "min(520px, 92%)",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25)",
  fontFamily: "inherit"
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 20px",
  borderBottom: "1px solid #e5e5e5",
  fontSize: 16,
  fontWeight: 600,
  color: "#1f2937"
};

const bodyStyle = {
  padding: "18px 20px",
  fontSize: 14,
  lineHeight: 1.55,
  color: "#374151"
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 20px",
  borderTop: "1px solid #e5e5e5",
  background: "#fafafa",
  borderRadius: "0 0 8px 8px"
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #cbd5e1",
  borderRadius: 4,
  marginTop: 6,
  boxSizing: "border-box",
  fontFamily: "inherit"
};

// Button color tokens. "primary" = the safe action; "warning" = the risky
// path (proceed with a duplicate). "neutral" = generic secondary.
const BUTTON_VARIANTS = {
  primary: {
    base: { background: "#05337f", borderColor: "#05337f", color: "#fff" },
    hover: { background: "#042a6b", borderColor: "#042a6b", color: "#fff" }
  },
  warning: {
    base: { background: "#fff", borderColor: "#b78103", color: "#b78103" },
    hover: { background: "#fff8e1", borderColor: "#8a6203", color: "#8a6203" }
  },
  neutral: {
    base: { background: "#fff", borderColor: "#cbd5e1", color: "#374151" },
    hover: { background: "#f3f4f6", borderColor: "#9ca3af", color: "#1f2937" }
  }
};

/**
 * Button with a built-in hover state. Variant controls the color tokens.
 */
function ModalButton({ variant = "neutral", onClick, children }) {
  const [hovered, setHovered] = useState(false);
  const tokens = BUTTON_VARIANTS[variant] || BUTTON_VARIANTS.neutral;
  const colors = hovered ? tokens.hover : tokens.base;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "8px 16px",
        borderRadius: 4,
        border: "1px solid",
        cursor: "pointer",
        fontSize: 14,
        fontWeight: 500,
        transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
        ...colors
      }}
    >
      {children}
    </button>
  );
}

/**
 * Modal shown when an uploaded dataset's source identity matches one
 * already loaded in the local database. The user can either cancel the
 * upload or save it as a separate dataset (the caller renames the source
 * id behind the scenes).
 *
 * @param {Object} props
 * @param {string} props.existingName - name of the already-loaded dataset
 * @param {() => void} props.onCancel
 * @param {() => void} props.onContinue
 */
export function DuplicateIdWarningModal({ existingName, onCancel, onContinue }) {
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="dup-id-title">
      <div style={dialogStyle}>
        <div style={headerStyle} id="dup-id-title">
          <FiAlertTriangle color="#b78103" /> Possible duplicate dataset
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>
            This upload appears to match a dataset already loaded in your browser
            {existingName ? (
              <>
                : <strong>{existingName}</strong>
              </>
            ) : (
              "."
            )}
          </p>
          <p style={{ marginBottom: 0 }}>
            If this is the same dataset you already uploaded, cancel. Otherwise it can be saved as a separate entry
            alongside the existing one.
          </p>
        </div>
        <div style={footerStyle}>
          <ModalButton variant="warning" onClick={onContinue}>
            Save as separate dataset
          </ModalButton>
          <ModalButton variant="primary" onClick={onCancel}>
            Cancel upload
          </ModalButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Modal shown when the uploaded dataset's display name matches one already
 * loaded. The user can edit the name (pre-filled with the next free
 * `name (n)`), accept it as-is, or keep the original duplicate name.
 *
 * @param {Object} props
 * @param {string} props.originalName - name as it would appear without the change
 * @param {string} props.suggestedName - "{name} (1)" or next-available
 * @param {(finalName: string) => void} props.onAccept
 * @param {() => void} props.onCancel
 */
export function DuplicateNameModal({ originalName, suggestedName, onAccept, onCancel }) {
  const [value, setValue] = useState(suggestedName);
  const trimmed = value.trim();
  const willKeepDuplicate = trimmed === originalName;
  const finalLabel = trimmed.length > 0 ? trimmed : originalName;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="dup-name-title">
      <div style={dialogStyle}>
        <div style={headerStyle} id="dup-name-title">
          <FiAlertTriangle color="#b78103" /> Dataset name already in use
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>
            A dataset called <strong>{originalName}</strong> is already loaded. Edit the name below to disambiguate, or
            keep the duplicate name if you really want to.
          </p>
          <label htmlFor="dup-name-input" style={{ fontSize: 13, color: "#6b7280" }}>
            Dataset name
          </label>
          <input
            id="dup-name-input"
            type="text"
            style={inputStyle}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          {willKeepDuplicate && (
            <p style={{ color: "#b78103", fontSize: 13, marginTop: 8, marginBottom: 0 }}>
              You&apos;ll have two datasets with the same name. They&apos;ll only be distinguishable by their upload
              time.
            </p>
          )}
        </div>
        <div style={footerStyle}>
          <ModalButton variant="neutral" onClick={onCancel}>
            Cancel upload
          </ModalButton>
          <ModalButton variant={willKeepDuplicate ? "warning" : "primary"} onClick={() => onAccept(finalLabel)}>
            {willKeepDuplicate ? "Keep duplicate name" : "Use this name"}
          </ModalButton>
        </div>
      </div>
    </div>
  );
}
