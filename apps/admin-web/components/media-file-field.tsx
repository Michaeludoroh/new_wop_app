"use client";

type MediaFileFieldProps = {
  label: string;
  accept: string;
  disabled?: boolean;
  status?: string | null;
  previewUrl?: string | null;
  previewAlt?: string;
  onSelect: (file: File) => void;
};

export default function MediaFileField({
  label,
  accept,
  disabled,
  status,
  previewUrl,
  previewAlt,
  onSelect
}: MediaFileFieldProps) {
  return (
    <label style={{ display: "grid", gap: 6 }}>
      <span>{label}</span>
      <input
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onSelect(file);
        }}
      />
      {status ? <small>{status}</small> : null}
      {previewUrl ? (
        <img
          src={previewUrl}
          alt={previewAlt ?? label}
          style={{ maxHeight: 160, maxWidth: "100%", objectFit: "cover", borderRadius: 8 }}
        />
      ) : null}
    </label>
  );
}
