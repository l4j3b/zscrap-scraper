import { SupabaseClient } from "./create-supabase-client";

export const deductApiCredit = async (
  supabase: SupabaseClient,
  organizationId: string
) => {
  const { data: updateAPICreditsResult, error: updateAPICreditsError } =
    await supabase.rpc("deduct_api_credit", {
      org_id: organizationId,
    });

  if (updateAPICreditsError) {
    throw new Error(
      "Failed to deduct API credit: " + updateAPICreditsError.message
    );
  }

  if (!updateAPICreditsResult[0].credits_deducted) {
    throw new Error("Insufficient API credits.");
  }
};
