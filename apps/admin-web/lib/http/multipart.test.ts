import { AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";
import { clearMultipartContentType, unwrapUploadResult } from "./multipart";

describe("unwrapUploadResult", () => {
  it("reads url and key from a flat upload payload", () => {
    expect(
      unwrapUploadResult({
        url: "https://woppandmopp.com/api/v1/uploads/ebooks/file/a.pdf",
        key: "ebooks/file/a.pdf"
      })
    ).toEqual({
      url: "https://woppandmopp.com/api/v1/uploads/ebooks/file/a.pdf",
      key: "ebooks/file/a.pdf"
    });
  });

  it("unwraps nested data envelopes", () => {
    expect(
      unwrapUploadResult({
        data: { url: "https://example.com/cover.jpg", storageKey: "ebooks/cover/b.jpg" }
      })
    ).toEqual({
      url: "https://example.com/cover.jpg",
      key: "ebooks/cover/b.jpg"
    });
  });
});

describe("clearMultipartContentType", () => {
  it("removes a default JSON content type so the browser can set the multipart boundary", () => {
    const headers = new AxiosHeaders();
    headers.set("Content-Type", "application/json");
    clearMultipartContentType(headers);
    expect(headers.get("Content-Type")).toBeUndefined();
  });
});
