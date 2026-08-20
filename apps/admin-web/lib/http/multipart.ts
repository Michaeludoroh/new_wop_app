import { AxiosInstance, AxiosRequestHeaders } from "axios";

export type UploadResult = {
  url: string;
  key: string;
};

export function unwrapUploadResult(data: unknown): UploadResult {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const inner =
    record.data && typeof record.data === "object"
      ? (record.data as Record<string, unknown>)
      : record;
  const url = typeof inner.url === "string" ? inner.url.trim() : "";
  const key =
    typeof inner.key === "string"
      ? inner.key.trim()
      : typeof inner.storageKey === "string"
        ? inner.storageKey.trim()
        : "";

  if (!url && !key) {
    throw new Error("Upload succeeded but the server did not return a media key.");
  }

  return { url, key: key || url };
}

export function clearMultipartContentType(headers: AxiosRequestHeaders | undefined) {
  if (!headers) return;
  const maybeSet = headers as AxiosRequestHeaders & {
    delete?: (name: string) => void;
    set?: (name: string, value: unknown) => void;
    setContentType?: (value: unknown, rewrite?: boolean) => void;
  };

  if (typeof maybeSet.setContentType === "function") {
    maybeSet.setContentType(false, true);
  }
  if (typeof maybeSet.delete === "function") {
    maybeSet.delete("Content-Type");
    maybeSet.delete("content-type");
  }
  delete (headers as Record<string, unknown>)["Content-Type"];
  delete (headers as Record<string, unknown>)["content-type"];
}

export async function postMultipart(
  client: AxiosInstance,
  url: string,
  file: File,
  field = "file"
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append(field, file, file.name);

  const response = await client.post<unknown>(url, formData, {
    timeout: 300000,
    transformRequest: [
      (data, headers) => {
        clearMultipartContentType(headers);
        return data;
      }
    ]
  });

  return unwrapUploadResult(response.data);
}
