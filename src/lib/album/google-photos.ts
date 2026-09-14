import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const googleStatus = createServerFn({ method: "GET" })
  .validator(z.object({ editHash: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const { readGoogleStatus } = await import("./google-photos.server");
    return readGoogleStatus(data.editHash);
  });

export const startGooglePicker = createServerFn({ method: "POST" })
  .validator(z.object({ editHash: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const { createPickerSession } = await import("./google-photos.server");
    return createPickerSession(data.editHash);
  });

export const pollGooglePicker = createServerFn({ method: "POST" })
  .validator(z.object({ editHash: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const { pickerReady } = await import("./google-photos.server");
    return pickerReady(data.editHash);
  });

export const importGooglePicker = createServerFn({ method: "POST" })
  .validator(z.object({ editHash: z.string().min(8).max(64) }))
  .handler(async ({ data }) => {
    const { importPickedPhotos } = await import("./google-photos.server");
    return importPickedPhotos(data.editHash);
  });
