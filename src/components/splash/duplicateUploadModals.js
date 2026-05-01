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
  borderRadius: "8px",
  width: "min(540px, 92%)",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
};

const headerStyle = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "16px 20px",
  borderBottom: "1px solid #dee2e6",
  backgroundColor: "#fff8e1",
  borderRadius: "8px 8px 0 0",
  fontWeight: 600
};

const bodyStyle = {
  padding: "20px",
  fontSize: 14,
  lineHeight: 1.5
};

const footerStyle = {
  display: "flex",
  justifyContent: "flex-end",
  gap: 8,
  padding: "12px 20px",
  borderTop: "1px solid #dee2e6"
};

const buttonStyle = {
  padding: "8px 16px",
  borderRadius: 4,
  border: "1px solid #ccc",
  cursor: "pointer",
  fontSize: 14,
  background: "#fff"
};

const primaryButtonStyle = {
  ...buttonStyle,
  background: "#05337f",
  borderColor: "#05337f",
  color: "#fff"
};

const inputStyle = {
  width: "100%",
  padding: "8px 10px",
  fontSize: 14,
  border: "1px solid #ccc",
  borderRadius: 4,
  marginTop: 8,
  boxSizing: "border-box"
};

/**
 * Modal shown when an uploaded dataset's `original_dataset_id` matches one
 * already loaded in the local database. The user can either cancel the
 * upload or proceed (in which case the caller will rename the source ID
 * to a non-colliding suffix).
 *
 * @param {Object} props
 * @param {string} props.uploadName - name of the dataset being uploaded
 * @param {string} props.existingName - name of the already-loaded dataset
 * @param {string} props.originalDatasetId - the colliding source id
 * @param {string} props.proposedNewId - the auto-renamed id ("foo-1", etc.)
 * @param {() => void} props.onCancel
 * @param {() => void} props.onContinue
 */
export function DuplicateIdWarningModal({
  uploadName,
  existingName,
  originalDatasetId,
  proposedNewId,
  onCancel,
  onContinue
}) {
  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="dup-id-title">
      <div style={dialogStyle}>
        <div style={headerStyle} id="dup-id-title">
          <FiAlertTriangle color="#b78103" /> Possible duplicate dataset
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>
            A dataset with source id <code>{originalDatasetId}</code> is already loaded
            {existingName ? (
              <>
                {" "}
                as <strong>{existingName}</strong>
              </>
            ) : null}
            .
          </p>
          <p>
            If this is the same dataset re-uploaded, you probably want to cancel. Otherwise the upload of{" "}
            <strong>{uploadName}</strong> will be saved with a renamed source id <code>{proposedNewId}</code> so it
            doesn&apos;t conflict.
          </p>
        </div>
        <div style={footerStyle}>
          <button type="button" style={buttonStyle} onClick={onCancel}>
            Cancel upload
          </button>
          <button type="button" style={primaryButtonStyle} onClick={onContinue}>
            Continue with renamed id
          </button>
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

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-labelledby="dup-name-title">
      <div style={dialogStyle}>
        <div style={headerStyle} id="dup-name-title">
          <FiAlertTriangle color="#b78103" /> Dataset name already in use
        </div>
        <div style={bodyStyle}>
          <p style={{ marginTop: 0 }}>
            A dataset called <strong>{originalName}</strong> is already loaded. Edit the name below to disambiguate, or
            keep the duplicate if you really want to.
          </p>
          <label htmlFor="dup-name-input" style={{ fontSize: 13, color: "#555" }}>
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
            <p style={{ color: "#b78103", fontSize: 13, marginTop: 8 }}>
              You&apos;ll have two datasets with the same name. They&apos;ll be distinguishable only by their source id
              and upload time.
            </p>
          )}
        </div>
        <div style={footerStyle}>
          <button type="button" style={buttonStyle} onClick={onCancel}>
            Cancel upload
          </button>
          <button
            type="button"
            style={primaryButtonStyle}
            onClick={() => onAccept(trimmed.length > 0 ? trimmed : originalName)}
          >
            {willKeepDuplicate ? "Keep duplicate name" : "Use this name"}
          </button>
        </div>
      </div>
    </div>
  );
}
