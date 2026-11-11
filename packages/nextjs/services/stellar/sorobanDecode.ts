import { scValToNative, xdr } from "@stellar/stellar-sdk";

export function safeScValToNative(val: xdr.ScVal | null | undefined): any {
  if (!val) return null;
  try {
    return scValToNative(val);
  } catch (e: any) {
    return null;
  }
}

export function normalizeAssetRecord(rawAsset: any) {
  if (!rawAsset) return null;
  try {
    const states = ["Pending", "Active", "Tokenized", "Closed", "Relisted"];
    const models = ["WholeOwnership", "Fractional"];

    let stateTag = rawAsset.state;
    if (typeof stateTag === "number") {
      stateTag = states[stateTag] ?? "Pending";
    } else if (typeof stateTag === "object" && stateTag !== null) {
      stateTag = stateTag.tag ?? states[0];
    }

    let modelTag = rawAsset.model;
    if (typeof modelTag === "number") {
      modelTag = models[modelTag] ?? "WholeOwnership";
    } else if (typeof modelTag === "object" && modelTag !== null) {
      modelTag = modelTag.tag ?? models[0];
    }

    return {
      ...rawAsset,
      state: { tag: stateTag },
      model: { tag: modelTag },
    };
  } catch {
    return rawAsset;
  }
}

export function normalizeKycRecord(rawRecord: any) {
  if (!rawRecord) return null;
  try {
    const statuses = ["None", "Pending", "Verified", "Rejected", "Suspended"];

    let statusTag = rawRecord.status;
    if (typeof statusTag === "number") {
      statusTag = statuses[statusTag] ?? "None";
    } else if (typeof statusTag === "object" && statusTag !== null) {
      statusTag = statusTag.tag ?? statuses[0];
    }

    return {
      ...rawRecord,
      status: { tag: statusTag },
    };
  } catch {
    return rawRecord;
  }
}
