const GAS_ENDPOINT = process.env.GAS_ENDPOINT!;
const SERVICE_ACCOUNT_EMAIL = "timeline@timeline-495506.iam.gserviceaccount.com";

export async function createOrGetProcessedSheet(gameName: string): Promise<string> {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
  const fileName = `[타임라인] ${gameName}`;

  const res = await fetch(GAS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      folderId,
      fileName,
      serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
    }),
  });

  const json = await res.json();
  if (!json.ok) throw new Error(`GAS error: ${json.error}`);
  return json.spreadsheetId as string;
}
